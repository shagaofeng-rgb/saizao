import "./admin.css";

export const metadata = {
  title: "Sai Zhao B2B Growth Console",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="admin-shell">{children}</div>;
}
