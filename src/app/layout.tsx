import type { Metadata } from 'next';
import './globals.css';
import { Inter, Roboto } from 'next/font/google';

// Configure the Inter font
const inter = Inter({ subsets: ['latin'] });

// Configure Roboto font
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'PaddockPal - Your F1 Expert',
  description: 'An AI-powered Formula 1 expert chatbot',
  icons: {
    icon: '/icon.png',
    apple: [
      { url: '/apple-touch-icon.png' },
      { url: '/apple-touch-icon-precomposed.png' }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Material icons still needed from Google CDN */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons" />
      </head>
      <body className={`${inter.className} ${roboto.variable}`}>{children}</body>
    </html>
  );
}