import AdminDialogProvider from "@/components/AdminDialogProvider";
import AdminShell from "@/components/AdminShell";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminDialogProvider>
      <AdminShell>{children}</AdminShell>
    </AdminDialogProvider>
  );
}
