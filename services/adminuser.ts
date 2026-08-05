type AuthUser = {
  email: string;
  role: string;
  name?: string;
};

type OtpStartResponse = {
  otpSessionId: string;
  deliveryEmail: string;
  expiresAt: number;
  message: string;
};

async function requestAuth<T>(url: string, options: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Authentication request failed.");
  }

  return payload as T;
}

export const signUpWithEmail = async (_email: string, _password: string) => {
  throw new Error("Sign up is not enabled in this build.");
};

export const signInWithEmail = async (email: string, password: string): Promise<OtpStartResponse> => {
  return await requestAuth<OtpStartResponse>("/api/auth/login/start", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
};

export const resendLoginOtp = async (email: string, password: string): Promise<OtpStartResponse> => {
  return await requestAuth<OtpStartResponse>("/api/auth/login/resend", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
};

export const verifyLoginOtp = async (email: string, otp: string, otpSessionId: string) => {
  return await requestAuth<{ success: boolean; user: AuthUser }>("/api/auth/login/verify", {
    method: "POST",
    body: JSON.stringify({ email, otp, otpSessionId }),
  });
};

export const signOut = async () => {
  await requestAuth<{ success: boolean }>("/api/auth/logout", {
    method: "POST",
  });

  if (typeof window !== "undefined") {
    window.location.href = "/auth/login";
  }
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const data = await requestAuth<{ user: AuthUser | null }>("/api/auth/session", {
    method: "GET",
  });
  return data.user;
};

export const getSession = async (): Promise<{ user: AuthUser | null; expiresAt?: number }> => {
  return await requestAuth<{ user: AuthUser | null; expiresAt?: number }>("/api/auth/session", {
    method: "GET",
  });
};

export const resetPassword = async (email: string) => {
  return await requestAuth<{ success: boolean; message: string }>("/api/auth/password/forgot", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
};

export const updatePassword = async (newPassword: string, token: string) => {
  return await requestAuth<{ success: boolean; message: string }>("/api/auth/password/reset", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
};