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
  });
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
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
  await client().send(
    new DeleteObjectCommand({
      Bucket: required("R2_BUCKET"),
      Key: key,
    }),
  );
}

export async function getFromR2(key: string) {
  return client().send(
    new GetObjectCommand({
      Bucket: required("R2_BUCKET"),
      Key: key,
    }),
  );
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
