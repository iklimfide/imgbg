import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MEDIA_CACHE_CONTROL } from "@/lib/site";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} tanımlı değil`);
  }
  return value;
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET,
  );
}

function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function bucket() {
  return required("R2_BUCKET");
}

let corsReady: Promise<void> | null = null;

export function ensureR2Cors() {
  corsReady ??= client()
    .send(
      new PutBucketCorsCommand({
        Bucket: bucket(),
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: ["*"],
              AllowedMethods: ["GET", "PUT", "HEAD"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag", "Content-Length"],
              MaxAgeSeconds: 86400,
            },
          ],
        },
      }),
    )
    .then(() => undefined)
    .catch(() => {
      corsReady = null;
    });
  return corsReady;
}

function encodeCopySource(key: string) {
  return `${bucket()}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export async function copyOnR2(fromKey: string, toKey: string, contentType: string) {
  try {
    await client().send(
      new CopyObjectCommand({
        Bucket: bucket(),
        CopySource: encodeCopySource(fromKey),
        Key: toKey,
        ContentType: contentType,
        CacheControl: MEDIA_CACHE_CONTROL,
        MetadataDirective: "REPLACE",
      }),
    );
    return;
  } catch {
    const object = await client().send(
      new GetObjectCommand({
        Bucket: bucket(),
        Key: fromKey,
      }),
    );
    const bytes = object.Body ? await object.Body.transformToByteArray() : new Uint8Array();
    await uploadToR2(toKey, Buffer.from(bytes), contentType);
  }
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: MEDIA_CACHE_CONTROL,
    }),
  );
}

export async function signedPutUrl(key: string, contentType: string) {
  return getSignedUrl(
    client(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      CacheControl: MEDIA_CACHE_CONTROL,
    }),
    { expiresIn: 60 * 10 },
  );
}

export async function signedGetUrl(key: string, expiresIn = 60 * 60 * 6) {
  return getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
    { expiresIn },
  );
}

export async function mediaSrc(kod: string, r2Key: string, protectedShare = false) {
  if (protectedShare) {
    return `/api/media/${kod}`;
  }
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${r2Key}`;
  }
  return signedGetUrl(r2Key);
}

export async function headFromR2(key: string) {
  try {
    const object = await client().send(
      new HeadObjectCommand({
        Bucket: bucket(),
        Key: key,
      }),
    );
    return {
      size: Number(object.ContentLength ?? 0),
      contentType: object.ContentType ?? null,
    };
  } catch {
    return null;
  }
}

export async function deleteFromR2(key: string) {
  await client().send(
    new DeleteObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
}

export async function getFromR2(key: string) {
  const object = await client().send(
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
    }),
  );
  return {
    stream: object.Body ? object.Body.transformToWebStream() : null,
    contentType: object.ContentType ?? null,
  };
}

export function publicMediaUrl(kod: string, r2Key: string, protectedShare = false) {
  if (protectedShare) {
    return `/api/media/${kod}`;
  }
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (base) {
    return `${base}/${r2Key}`;
  }
  return `/api/media/${kod}`;
}
