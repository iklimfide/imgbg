import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} tanımlı değil`);
  }
  return value;
}

export function isR2Configured() {
  return Boolean(
    process.env.R2_BUCKET ||
      (process.env.R2_ACCOUNT_ID &&
        process.env.R2_ACCESS_KEY_ID &&
        process.env.R2_SECRET_ACCESS_KEY),
  );
}

type BoundBucket = {
  put: (
    key: string,
    value: Buffer,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (
    key: string,
  ) => Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete: (key: string) => Promise<unknown>;
};

async function boundBucket(): Promise<BoundBucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext({ async: true });
    return (env?.MEDIA_BUCKET as BoundBucket | undefined) ?? null;
  } catch {
    return null;
  }
}

function client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  const bucket = await boundBucket();
  if (bucket) {
    await bucket.put(key, body, { httpMetadata: { contentType } });
    return;
  }
  await client().send(
    new PutObjectCommand({
      Bucket: required("R2_BUCKET"),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteFromR2(key: string) {
  const bucket = await boundBucket();
  if (bucket) {
    await bucket.delete(key);
    return;
  }
  await client().send(
    new DeleteObjectCommand({
      Bucket: required("R2_BUCKET"),
      Key: key,
    }),
  );
}

export async function getFromR2(key: string) {
  const bucket = await boundBucket();
  if (bucket) {
    const object = await bucket.get(key);
    if (!object) {
      return { stream: null, contentType: null };
    }
    return {
      stream: object.body,
      contentType: object.httpMetadata?.contentType ?? null,
    };
  }
  const object = await client().send(
    new GetObjectCommand({
      Bucket: required("R2_BUCKET"),
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
