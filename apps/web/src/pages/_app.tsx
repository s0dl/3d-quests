import "@/styles/globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import { MantineProvider, createTheme } from '@mantine/core';
import type { AppProps } from "next/app";

const theme = createTheme({
  primaryColor: 'violet',
  fontFamily: 'Inter, sans-serif',
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Component {...pageProps} />
    </MantineProvider>
  );
}
