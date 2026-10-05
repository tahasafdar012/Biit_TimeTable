import logo from "../assets/biit-logo.png";

export default function Header({ onLogout, onChangePassword }) {
  return (
    <header className="bg-green-800 text-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="BIIT logo" className="h-10 w-10 shrink-0 rounded-full bg-white" />
          <h1 className="text-base font-semibold sm:text-lg">BIIT Time Table Admin Panel</h1>
        </div>

        {onLogout && (
          <nav className="flex gap-4 text-sm">
            <button onClick={onChangePassword} className="text-green-100 hover:text-white hover:underline">
              Change password
            </button>
            <button onClick={onLogout} className="text-green-100 hover:text-white hover:underline">
              Log out
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
