import AuthForm from './AuthForm';

type SearchParams = { [key: string]: string | string[] | undefined };

function wantsRegisterTab(params: SearchParams | undefined): boolean {
  if (!params) return false;
  const reg = params.register;
  const mode = params.mode;
  const regStr = Array.isArray(reg) ? reg[0] : reg;
  const modeStr = Array.isArray(mode) ? mode[0] : mode;
  return regStr === '1' || regStr === 'true' || modeStr === 'register';
}

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const mode = wantsRegisterTab(searchParams) ? 'register' : 'login';
  return <AuthForm mode={mode} />;
}
