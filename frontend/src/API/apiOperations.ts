import instance from './axiosInstance';

export const getUsers = async () => {
  try {
    const { data } = await instance.get('/api/users');
    return data.result;
  } catch (error: unknown) {
    // Type-safe error handling
    const err = error as {
      response?: {
        data?: { message: string };
        status: number;
      };
    };

    const response = {
      message: err.response?.data?.message || 'Unknown error',
      statusCode: err.response?.status || 500,
    };
    console.log(response.message);

    return response;
  }
};
