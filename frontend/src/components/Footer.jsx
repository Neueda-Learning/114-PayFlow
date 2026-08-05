export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-200 py-3 px-4 shrink-0 text-center">
      <p className="text-xs text-slate-600 font-medium">
        © {year} PayFlow Enterprise System. All rights reserved.
      </p>
    </footer>
  );
}
