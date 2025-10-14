import { createAsyncThunk } from "@reduxjs/toolkit";
import instance from "../../API/axiosInstance.js";
import toastMaker from "../../utils/toastMaker/toastMaker";
import type { RootState } from "../store";

interface AxiosError {
  response?: {
    data?: {
      message?: string;
    };
    status?: number;
  };
  message?: string;
}

interface UserInfo {
  email: string;
  password: string;
}

interface UserData extends UserInfo {
  _id: string;
}

const setAuthHeader = (token: string) => {
  instance.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};
const clearAuthHeader = () => {
  instance.defaults.headers.common["Authorization"] = "";
};

export const login = createAsyncThunk(
  "user/login",
  async (userInfo: UserInfo, thunkAPI) => {
    try {
      const { data } = await instance.post("/api/users/login", userInfo);
      setAuthHeader(data.token);
      return data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const response = {
        message: axiosError.response?.data?.message,
        statusCode: axiosError.response?.status || 500,
      };

      if (response.statusCode === 401) {
        if (response.message === "Please verify your email") {
          toastMaker("Please verify your email", "error");
        } else {
          toastMaker("Email or password is wrong", "error");
        }
      } else {
        toastMaker("Login failed", "error");
      }
      return thunkAPI.rejectWithValue(response);
    }
  }
);

export const register = createAsyncThunk(
  "user/register",
  async (userInfo, thunkAPI) => {
    try {
      const { data } = await instance.post("/api/users/register", userInfo);
      // setAuthHeader(data.token);
      // login(userInfo);
      return data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const response = {
        message: axiosError.response?.data?.message,
        statusCode: axiosError.response?.status || 500,
      };
      if (response.statusCode === 409) {
        toastMaker("This email is already used", "error");
      }
      return thunkAPI.rejectWithValue(response);
    }
  }
);

export const logout = createAsyncThunk("user/logout", async (_, thunkAPI) => {
  try {
    const { data } = await instance.post("/api/users/logout");
    clearAuthHeader();
    return data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    return thunkAPI.rejectWithValue(axiosError.message);
  }
});

export const refreshUserToken = createAsyncThunk<
  ReturnType<typeof instance.get>,
  void,
  { state: RootState }
>(
  "user/refreshUserToken",
  async (_, thunkAPI) => {
    const {
      user: { refreshToken },
    } = thunkAPI.getState();
    if (!refreshToken) {
      throw new Error("empty refresh token");
    }
    const { data } = await instance.get("/api/users/refresh", {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });

    setAuthHeader(data.accessToken);

    return data;
  },
  {
    condition: (_, { getState }) => {
      const state = getState() as RootState;
      const refreshToken = state.user?.refreshToken;

      return refreshToken !== null;
    },
  }
);

export const fetchUser = createAsyncThunk(
  "user/fetchUser",
  async (_, thunkAPI) => {
    try {
      const { data } = await instance.get(`/api/users/current`);
      return data;
    } catch (error) {
      const err = error as AxiosError;
      const response = {
        message: err.response?.data?.message,
        statusCode: err.response?.status,
      };
      return thunkAPI.rejectWithValue(response);
    }
  }
);

export const updateUser = createAsyncThunk(
  "user/updateUser",
  async (userData: UserData, thunkAPI) => {
    try {
      const { data } = await instance.put(
        `/api/users/${userData._id}`,
        userData
      );
      return data;
    } catch (error) {
      const err = error as AxiosError;
      const response = {
        message: err.response?.data?.message,
        statusCode: err.response?.status,
      };
      return thunkAPI.rejectWithValue(response);
    }
  }
);

export const updateAvatar = createAsyncThunk<
  unknown,
  File,
  { state: RootState }
>("user/updateAvatar", async (avatarFile, thunkAPI) => {
  try {
    const {
      user: { user },
    } = thunkAPI.getState() as RootState;
    const { data } = await instance.put(`/api/users/${user._id}`, avatarFile, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return data;
  } catch (error) {
    return thunkAPI.rejectWithValue(error.message);
  }
});
