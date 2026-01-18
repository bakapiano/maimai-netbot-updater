/**
 * Diving-Fish (水鱼查分器) API 客户端
 */

const BASE_URL = 'https://www.diving-fish.com/api/maimaidxprober';

const DEFAULT_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://www.diving-fish.com',
  Referer: 'https://www.diving-fish.com/maimaidx/prober/',
};

export type DivingFishProfile = {
  import_token?: string;
  nickname?: string;
  username?: string;
};

export type DivingFishLoginResult = {
  jwtToken: string;
};

/**
 * 使用用户名和密码登录水鱼，获取 JWT token
 */
export async function login(
  username: string,
  password: string,
): Promise<DivingFishLoginResult> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const errorData = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(errorData?.message || `登录失败 (HTTP ${res.status})`);
  }

  // Extract jwt_token from Set-Cookie header
  const setCookieHeader = res.headers.get('set-cookie');
  const jwtTokenMatch = setCookieHeader?.match(/jwt_token=([^;]+)/);
  if (!jwtTokenMatch) {
    throw new Error('无法获取登录凭证');
  }

  return { jwtToken: jwtTokenMatch[1] };
}

/**
 * 获取用户 profile（需要 JWT token）
 */
export async function getProfile(jwtToken: string): Promise<DivingFishProfile> {
  const res = await fetch(`${BASE_URL}/player/profile`, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: `jwt_token=${jwtToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`获取用户信息失败 (HTTP ${res.status})`);
  }

  return res.json() as Promise<DivingFishProfile>;
}

/**
 * 刷新/生成新的 import token（需要 JWT token）
 * 注意：这会覆盖原有的 import token
 */
export async function refreshImportToken(jwtToken: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/player/import_token`, {
    method: 'PUT',
    headers: {
      ...DEFAULT_HEADERS,
      Cookie: `jwt_token=${jwtToken}`,
    },
  });

  if (!res.ok) {
    throw new Error(`刷新 import token 失败 (HTTP ${res.status})`);
  }
}

/**
 * 通过用户名和密码获取 import token
 * 如果用户已有 import token 则直接返回，否则生成新的
 */
export async function getImportToken(
  username: string,
  password: string,
): Promise<{ importToken: string; nickname?: string }> {
  // Step 1: Login
  const { jwtToken } = await login(username, password);

  // Step 2: Get profile to check if import_token exists
  const profile = await getProfile(jwtToken);

  // Step 3: If no import_token, create one
  if (!profile.import_token) {
    await refreshImportToken(jwtToken);
    // Get profile again to retrieve the new token
    const updatedProfile = await getProfile(jwtToken);
    if (!updatedProfile.import_token) {
      throw new Error('无法获取 import token');
    }
    return {
      importToken: updatedProfile.import_token,
      nickname: updatedProfile.nickname,
    };
  }

  return {
    importToken: profile.import_token,
    nickname: profile.nickname,
  };
}

export type DivingFishRecord = {
  achievements: number | null;
  dxScore: number | null;
  fc: string | null;
  fs: string | null;
  level_index: number;
  title: string;
  type: 'SD' | 'DX';
};

export type UploadRecordsResponse = {
  status: number;
  data: unknown;
};

/**
 * 上传成绩记录到水鱼查分器
 */
export async function uploadRecords(
  records: DivingFishRecord[],
  importToken: string,
): Promise<UploadRecordsResponse> {
  const res = await fetch(`${BASE_URL}/player/update_records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Import-Token': importToken,
    },
    body: JSON.stringify(records),
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const detail = typeof data === 'string' ? data : JSON.stringify(data);
    throw new Error(
      `Diving-fish responded ${res.status}${detail ? `: ${detail}` : ''}`,
    );
  }

  return {
    status: res.status,
    data,
  };
}
