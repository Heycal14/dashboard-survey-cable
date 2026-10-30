export type SSOResponse = {
  auth?: string;
  message?: string;
  status?: number;
  [key: string]: unknown;
};

export async function verifySSOCredentials(
  username: string,
  password: string,
): Promise<{ success: boolean; message?: string }> {
  try {
    const params = new URLSearchParams();
    params.append("username", username);
    params.append("password", password);

    const res = await fetch(
      "https://mtt.diginav.id/mtt_react/api/sso-api-container",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );

    if (!res.ok) {
      return { success: false, message: `SSO server error (${res.status})` };
    }

    const data: SSOResponse = await res.json();
    if (data.auth === "Yes") {
      return { success: true };
    }

    return {
      success: false,
      message: data.message || "Autentikasi SSO gagal",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Gagal terhubung ke SSO server",
    };
  }
}
