export function authErrorTr(cause: unknown, mode: "giris" | "kayit") {
  const row =
    cause && typeof cause === "object"
      ? (cause as { message?: string; code?: string; statusText?: string; error?: { message?: string; code?: string } })
      : null;
  const nested = row?.error;
  const code = (nested?.code ?? row?.code ?? "").toUpperCase();
  const raw = String(nested?.message ?? row?.message ?? row?.statusText ?? (cause instanceof Error ? cause.message : "")).trim();
  const text = raw.toLowerCase();

  if (code === "INVALID_ORIGIN" || text.includes("invalid origin")) {
    return "Bu siteden giriş şu an doğrulanamadı. Sayfayı yenileyip tekrar dene.";
  }
  if (code === "INVALID_EMAIL_OR_PASSWORD" || text.includes("invalid email or password") || text.includes("invalid password")) {
    return mode === "giris" ? "E-posta veya şifre hatalı." : "Şifre geçersiz.";
  }
  if (code === "USER_NOT_FOUND" || text.includes("user not found")) {
    return "Bu bilgilerle hesap bulunamadı.";
  }
  if (
    code === "USER_ALREADY_EXISTS" ||
    code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" ||
    text.includes("already exists") ||
    text.includes("user already")
  ) {
    return "Bu kullanıcı adı zaten alınmış.";
  }
  if (code === "PASSWORD_TOO_SHORT" || text.includes("password is too short") || text.includes("minpassword")) {
    return "Şifre en az 8 karakter olmalı.";
  }
  if (code === "PASSWORD_TOO_LONG" || text.includes("password is too long")) {
    return "Şifre çok uzun.";
  }
  if (code === "INVALID_EMAIL" || text.includes("invalid email")) {
    return "E-posta adresi geçersiz.";
  }
  if (code === "TOO_MANY_REQUESTS" || text.includes("too many")) {
    return "Çok fazla deneme. Biraz bekleyip tekrar dene.";
  }
  if (code === "FAILED_TO_CREATE_USER" || text.includes("failed to create")) {
    return "Hesap oluşturulamadı. Biraz sonra tekrar dene.";
  }
  if (text.includes("credential") && text.includes("not found")) {
    return "Bu hesap için şifre girişi yok.";
  }
  if (/[çğıöşüÇĞİÖŞÜ]/.test(raw)) {
    return raw;
  }
  return mode === "kayit" ? "Kayıt tamamlanamadı." : "Giriş yapılamadı.";
}
