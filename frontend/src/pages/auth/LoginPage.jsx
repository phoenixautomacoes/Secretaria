import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, resetPassword } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showReset, setShowReset] = useState(false);
  const [resetForm, setResetForm] = useState({ email: '', newPassword: '', confirm: '' });
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(form);
      setAuth(token, user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Falha ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    if (resetForm.newPassword !== resetForm.confirm) {
      setResetError('As senhas não coincidem');
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword({ email: resetForm.email, newPassword: resetForm.newPassword });
      setResetSuccess('Senha redefinida com sucesso! Faça login com a nova senha.');
      setResetForm({ email: '', newPassword: '', confirm: '' });
      setTimeout(() => {
        setShowReset(false);
        setResetSuccess('');
      }, 2500);
    } catch (err) {
      setResetError(err.response?.data?.error || 'Falha ao redefinir senha');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-400">Phoenix</h1>
          <p className="text-gray-500 mt-1">Secretária Virtual</p>
        </div>

        {!showReset ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Senha"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">
                Entrar
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowReset(true); setError(''); }}
                className="text-sm text-gray-500 hover:text-primary-400 transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-200 mb-4">Redefinir senha</h2>
            <form onSubmit={handleReset} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                placeholder="seu@email.com"
                value={resetForm.email}
                onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                required
              />
              <Input
                label="Nova senha"
                type="password"
                placeholder="••••••••"
                value={resetForm.newPassword}
                onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
                required
              />
              <Input
                label="Confirmar nova senha"
                type="password"
                placeholder="••••••••"
                value={resetForm.confirm}
                onChange={(e) => setResetForm({ ...resetForm, confirm: e.target.value })}
                required
              />
              {resetError && <p className="text-sm text-red-500">{resetError}</p>}
              {resetSuccess && <p className="text-sm text-green-500">{resetSuccess}</p>}
              <Button type="submit" loading={resetLoading} className="w-full">
                Redefinir senha
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => { setShowReset(false); setResetError(''); setResetSuccess(''); }}
                className="text-sm text-gray-500 hover:text-primary-400 transition-colors"
              >
                Voltar ao login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
