import { createAsyncThunk } from "@reduxjs/toolkit";
import instance from "../../API/axiosInstance";
import toastMaker from "../../utils/toastMaker/toastMaker";
import type { RootState } from "../store";

interface AxiosError {
  response?: {
    data?: {
      message?: string;
      error?: string;
    };
    status?: number;
  };
  message?: string;
}

interface UserInfo {
  email: string;
  password: string;
}

interface RegisterInfo extends UserInfo {
  name: string;
}

interface UserData {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  theme?: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponseFromServer {
  user: UserData;
  tokens: AuthTokens;
}

export type AuthResult = {
  user: UserData;
  token: string;
  refreshToken: string | null;
};

interface ResponseError {
  message?: string;
  statusCode?: number;
}

const setAuthHeader = (token: string) => {
  instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

const clearAuthHeader = () => {
  instance.defaults.headers.common["Authorization"] = "";
};

/**
 * Login user - adapted for new backend
 */
export const login = createAsyncThunk<
  AuthResult,
  UserInfo,
  { rejectValue: ResponseError }
>("user/login", async (userInfo: UserInfo, thunkAPI) => {
  try {
    const { data } = await instance.post<AuthResponseFromServer>(
      "/api/auth/login",
      userInfo
    );

    // New backend returns: { user, tokens: { accessToken, refreshToken } }
    setAuthHeader(data.tokens.accessToken);

    return {
      user: data.user,
      token: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const response: ResponseError = {
      message:
        axiosError.response?.data?.message || axiosError.response?.data?.error,
      statusCode: axiosError.response?.status || 500,
    };

    if (response.statusCode === 401) {
      toastMaker("Email or password is wrong", "error");
    } else {
      toastMaker("Login failed", "error");
    }

    return thunkAPI.rejectWithValue(response);
  }
});

/**
 * Register user
 */
export const register = createAsyncThunk<
  AuthResult,
  RegisterInfo,
  { rejectValue: ResponseError }
>("user/register", async (userInfo: RegisterInfo, thunkAPI) => {
  try {
    const { data } = await instance.post<AuthResponseFromServer>(
      "/api/auth/register",
      userInfo
    );

    setAuthHeader(data.tokens.accessToken);

    return {
      user: data.user,
      token: data.tokens.accessToken,
      refreshToken: data.tokens.refreshToken,
    };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    const response = {
      message:
        axiosError.response?.data?.message || axiosError.response?.data?.error,
      statusCode: axiosError.response?.status || 500,
    };

    if (response.statusCode === 409 || response.statusCode === 400) {
      toastMaker(response.message || "This email is already used", "error");
    } else {
      toastMaker("Registration failed", "error");
    }

    return thunkAPI.rejectWithValue(response);
  }
});

/**
 * Logout user
 */
export const logout = createAsyncThunk<
  void,
  void,
  { state: RootState; rejectValue: string | undefined }
>("user/logout", async (_, thunkAPI) => {
  try {
    const state = thunkAPI.getState() as RootState;
    const refreshToken = state.user.refreshToken;

    if (refreshToken) {
      await instance.post("/api/auth/logout", { refreshToken });
    }

    clearAuthHeader();
    return;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    clearAuthHeader(); // Clear anyway
    return thunkAPI.rejectWithValue(axiosError.message);
  }
});

/**
 * Refresh user token
 */
export const refreshUserToken = createAsyncThunk<
  AuthResult,
  void,
  { state: RootState; rejectValue: ResponseError }
>(
  "user/refreshUserToken",
  async (_, thunkAPI) => {
    const state = thunkAPI.getState();
    const refreshToken = state.user.refreshToken;

    if (!refreshToken) {
      return thunkAPI.rejectWithValue({
        message: "No refresh token available",
        statusCode: 401,
      });
    }

    try {
      // New backend expects: POST /api/auth/refresh with { refreshToken }
      const { data } = await instance.post<AuthResponseFromServer>(
        "/api/auth/refresh",
        {
          refreshToken,
        }
      );

      setAuthHeader(data.tokens.accessToken);

      // Also fetch current user data
      const userResponse = await instance.get<{ user: UserData }>(
        "/api/auth/me"
      );

      return {
        user: userResponse.data.user,
        token: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      };
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      clearAuthHeader();
      return thunkAPI.rejectWithValue({
        message: axiosError.message,
        statusCode: axiosError.response?.status,
      });
    }
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      const refreshToken = state.user?.refreshToken;
      return refreshToken !== null && refreshToken !== undefined;
    },
  }
);

/**
 * Fetch current user - adapted for new backend
 */
export const fetchUser = createAsyncThunk<
  UserData,
  void,
  { rejectValue: ResponseError }
>("user/fetchUser", async (_, thunkAPI) => {
  try {
    const { data } = await instance.get<{ user: UserData }>("/api/auth/me");
    return data.user;
  } catch (error) {
    const err = error as AxiosError;
    const response: ResponseError = {
      message: err.response?.data?.message || err.response?.data?.error,
      statusCode: err.response?.status,
    };
    return thunkAPI.rejectWithValue(response);
  }
});

/**
 * Update user - needs to be added to backend
 * For now, keep the structure but it won't work until backend endpoint is added
 */
export const updateUser = createAsyncThunk<
  UserData,
  UserData,
  { state: RootState; rejectValue: ResponseError }
>("user/updateUser", async (userData: UserData, thunkAPI) => {
  try {
    // TODO: Add this endpoint to backend: PATCH /api/auth/profile
    const { data } = await instance.patch<{ user: UserData }>(
      "/api/auth/profile",
      {
        name: userData.name,
        theme: userData.theme,
      }
    );

    return data.user;
  } catch (error: unknown) {
    const err = error as AxiosError;
    const response: ResponseError = {
      message: err.response?.data?.message || err.response?.data?.error,
      statusCode: err.response?.status,
    };
    toastMaker("Failed to update profile", "error");
    return thunkAPI.rejectWithValue(response);
  }
});

/**
 * Update avatar - needs to be added to backend
 * For now, keep the structure but it won't work until backend endpoint is added
 */
export const updateAvatar = createAsyncThunk<
  AuthResult,
  File,
  { state: RootState; rejectValue: string | undefined }
>("user/updateAvatar", async (avatarFile, thunkAPI) => {
  try {
    const formData = new FormData();
    formData.append("avatar", avatarFile);

    // TODO: Add this endpoint to backend: PATCH /api/auth/avatar
    const { data } = await instance.patch<AuthResponseFromServer>(
      "/api/auth/avatar",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return {
      user: data.user,
      token: data.tokens?.accessToken ?? "",
      refreshToken: data.tokens?.refreshToken ?? null,
    };
  } catch (error: unknown) {
    const err = error as AxiosError;
    toastMaker("Failed to update avatar", "error");
    return thunkAPI.rejectWithValue(err.message);
  }
});

export { setAuthHeader, clearAuthHeader };
