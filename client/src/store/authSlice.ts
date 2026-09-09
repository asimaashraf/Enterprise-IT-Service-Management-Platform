import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { authApi } from '@/lib/authApi'
import { authStorage } from '@/lib/authStorage'
import type {
  AuthSession,
  AuthUser,
  LoginCredentials,
  RegisterPayload,
} from '@/types/auth'

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

interface AuthState {
  user: AuthUser | null
  token: string | null
  status: AuthStatus
  /**
   * Tracks the initial boot-up rehydration. Components rendering on
   * mount can wait for `initialized` before deciding to redirect.
   */
  initialized: boolean
  error: string | null
}

const initialState: AuthState = {
  user: authStorage.getUser(),
  token: authStorage.getToken(),
  status: authStorage.getToken() ? 'authenticated' : 'unauthenticated',
  initialized: false,
  error: null,
}

interface ApiRejection {
  responseMessage?: string
  fallback: string
}

const normalizeError = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    // axios errors expose the server message on .response.data.message
    const maybeAxios = error as Error & {
      response?: { data?: { message?: string } }
    }
    if (maybeAxios.response?.data?.message) {
      return maybeAxios.response.data.message
    }
    return error.message
  }
  return fallback
}

export const loginThunk = createAsyncThunk<
  AuthSession,
  LoginCredentials,
  { rejectValue: ApiRejection }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    return await authApi.login(credentials)
  } catch (error) {
    return rejectWithValue({
      responseMessage: normalizeError(error, 'Login failed'),
      fallback: 'Login failed',
    })
  }
})

export const registerThunk = createAsyncThunk<
  { user: AuthUser },
  RegisterPayload,
  { rejectValue: ApiRejection }
>('auth/register', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.register(payload)
  } catch (error) {
    return rejectWithValue({
      responseMessage: normalizeError(error, 'Registration failed'),
      fallback: 'Registration failed',
    })
  }
})

/**
 * Separate thunk for the registration page.
 * Unlike login, registration does NOT auto-authenticate the user — they
 * must verify their email first. This thunk returns the session but
 * does NOT persist it to storage or set the auth status to authenticated.
 * The RegisterPage handles this specially by showing a "check your email"
 * screen instead of redirecting.
 */
export const registerAndVerifyThunk = createAsyncThunk<
  { user: AuthUser },
  RegisterPayload,
  { rejectValue: ApiRejection }
>('auth/registerAndVerify', async (payload, { rejectWithValue }) => {
  try {
    return await authApi.register(payload)
  } catch (error) {
    return rejectWithValue({
      responseMessage: normalizeError(error, 'Registration failed'),
      fallback: 'Registration failed',
    })
  }
})

export const logoutThunk = createAsyncThunk<void>('auth/logout', async () => {
  // Backend does not expose a logout endpoint; clear local session only.
  authStorage.clear()
})

export const restoreSessionThunk = createAsyncThunk<
  AuthUser | null,
  void,
  { rejectValue: ApiRejection }
>('auth/restore', async (_arg, { rejectWithValue }) => {
  if (!authStorage.getToken()) {
    return null
  }
  try {
    return await authApi.getCurrentUser()
  } catch (error) {
    authStorage.clear()
    return rejectWithValue({
      responseMessage: normalizeError(error, 'Session restore failed'),
      fallback: 'Session restore failed',
    })
  }
})

// ==========================================
// EMAIL VERIFICATION / PASSWORD RESET THUNKS
// These do not modify the auth session — they only surface success/error
// messages to the caller. They share the same `error` field on the slice
// so a single error display path is reused across the auth pages.
// ==========================================

interface VerifyEmailArgs {
  token: string
}

interface ResendArgs {
  email: string
}

interface ForgotPasswordArgs {
  email: string
}

interface ResetPasswordArgs {
  token: string
  password: string
}

export const verifyEmailThunk = createAsyncThunk<
  string,
  VerifyEmailArgs,
  { rejectValue: ApiRejection }
>('auth/verifyEmail', async ({ token }, { rejectWithValue }) => {
  try {
    return await authApi.verifyEmail(token)
  } catch (error) {
    return rejectWithValue({
      responseMessage: normalizeError(
        error,
        'Verification failed. The link may have expired.',
      ),
      fallback: 'Verification failed',
    })
  }
})

export const resendVerificationThunk = createAsyncThunk<
  string,
  ResendArgs,
  { rejectValue: ApiRejection }
>('auth/resendVerification', async ({ email }, { rejectWithValue }) => {
  try {
    return await authApi.resendVerification(email)
  } catch (error) {
    return rejectWithValue({
      responseMessage: normalizeError(
        error,
        'Could not resend the verification email.',
      ),
      fallback: 'Resend failed',
    })
  }
})

export const forgotPasswordThunk = createAsyncThunk<
  string,
  ForgotPasswordArgs,
  { rejectValue: ApiRejection }
>('auth/forgotPassword', async ({ email }, { rejectWithValue }) => {
  try {
    return await authApi.forgotPassword(email)
  } catch (error) {
    return rejectWithValue({
      responseMessage: normalizeError(
        error,
        'Could not send a password reset email.',
      ),
      fallback: 'Reset request failed',
    })
  }
})

export const resetPasswordThunk = createAsyncThunk<
  string,
  ResetPasswordArgs,
  { rejectValue: ApiRejection }
>('auth/resetPassword', async ({ token, password }, { rejectWithValue }) => {
  try {
    return await authApi.resetPassword(token, password)
  } catch (error) {
    return rejectWithValue({
      responseMessage: normalizeError(
        error,
        'Could not reset the password. The link may have expired.',
      ),
      fallback: 'Password reset failed',
    })
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthSession>) {
      state.user = action.payload.user
      state.token = action.payload.token
      state.status = 'authenticated'
      state.error = null
      authStorage.setSession(action.payload)
    },
    clearAuth(state) {
      state.user = null
      state.token = null
      state.status = 'unauthenticated'
      state.error = null
    },
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.token = action.payload.token
        state.status = 'authenticated'
        state.error = null
        authStorage.setSession(action.payload)
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'unauthenticated'
        state.error =
          action.payload?.responseMessage ?? action.payload?.fallback ?? 'Login failed'
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(registerThunk.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.status = 'unauthenticated'
        state.error = null
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = 'unauthenticated'
        state.error =
          action.payload?.responseMessage ??
          action.payload?.fallback ??
          'Registration failed'
      })
      // registerAndVerifyThunk — does NOT update auth state; caller handles UI.
      .addCase(registerAndVerifyThunk.rejected, (state, action) => {
        state.error =
          action.payload?.responseMessage ??
          action.payload?.fallback ??
          'Registration failed'
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null
        state.token = null
        state.status = 'unauthenticated'
        state.error = null
      })
      .addCase(restoreSessionThunk.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.initialized = true
        if (action.payload) {
          const sameAccount = state.user?.id === action.payload.id &&
            state.user?.organizationId === action.payload.organizationId
          // /auth/me echoes JWT claims, not a fresh database profile. Keep
          // saved display fields for this account only, after token validation.
          state.user = sameAccount && state.user
            ? { ...state.user, ...action.payload,
                name: state.user.name ?? action.payload.name,
                email: state.user.email ?? action.payload.email }
            : action.payload
          state.status = 'authenticated'
        } else {
          state.user = null
          state.token = null
          state.status = 'unauthenticated'
        }
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.user = null
        state.token = null
        state.status = 'unauthenticated'
        state.initialized = true
        state.error = null
      })
      // verifyEmailThunk — only writes an error; no session change.
      .addCase(verifyEmailThunk.rejected, (state, action) => {
        state.error =
          action.payload?.responseMessage ?? 'Verification failed'
      })
      // resendVerificationThunk — only writes an error.
      .addCase(resendVerificationThunk.rejected, (state, action) => {
        state.error =
          action.payload?.responseMessage ?? 'Could not resend verification email'
      })
      // forgotPasswordThunk — only writes an error.
      .addCase(forgotPasswordThunk.rejected, (state, action) => {
        state.error =
          action.payload?.responseMessage ?? 'Password reset request failed'
      })
      // resetPasswordThunk — only writes an error.
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.error =
          action.payload?.responseMessage ?? 'Password reset failed'
      })
  },
})

export const { setCredentials, clearAuth, clearError } = authSlice.actions
export default authSlice.reducer
