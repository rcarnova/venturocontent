import "./globals.css";

export const metadata = {
  title: "Venturo Content Suite",
  description: "L'invisibile diventa strategia",
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
