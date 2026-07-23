import { signOutAction } from "@/shared/lib/auth/actions";

type SignOutButtonProps = {
  className?: string;
  label?: string;
  redirectTo?: string;
};

export function SignOutButton({
  className = "button button--outline",
  label = "Cerrar sesión",
  redirectTo = "/login?estado=sesion-cerrada",
}: SignOutButtonProps) {
  return (
    <form action={signOutAction}>
      <input name="next" type="hidden" value={redirectTo} />
      <button className={className} type="submit">
        {label}
      </button>
    </form>
  );
}
