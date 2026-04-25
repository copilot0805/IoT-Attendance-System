import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../features/auth/useAuth';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginForm) => {
    setServerError('');
    try {
      await login(values);
      navigate('/');
    } catch (error) {
      setServerError((error as Error).message || 'Login failed');
    }
  };

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <h1>Welcome Back</h1>
        <p>Sign in to manage the IoT attendance system.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="stack">
          <label>
            Email
            <input type="email" placeholder="admin@example.com" {...register('email')} />
            {errors.email ? <span className="error">{errors.email.message}</span> : null}
          </label>

          <label>
            Password
            <input type="password" placeholder="********" {...register('password')} />
            {errors.password ? (
              <span className="error">{errors.password.message}</span>
            ) : null}
          </label>

          {serverError ? <div className="alert error">{serverError}</div> : null}

          <button type="submit" className="button" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </div>
  );
}
