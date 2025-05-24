// astroinsight/src/client/App.jsx
import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom'; // Wasp router is used, but this import might be needed for some Chakra context providers
import { ChakraProvider, ColorModeScript, extendTheme } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // For Wasp queries/actions
import Layout from './components/layout/Layout'; // Main layout component
import './App.css'; // For any global styles not handled by Chakra

// Define custom theme (colors, fonts, etc.)
const colors = {
  brand: {
    // Cosmic purple theme
    900: '#3A2F6E', // Darkest Purple
    800: '#4B3D8A',
    700: '#5C4AA7',
    600: '#6D58C3', // Main Purple
    500: '#7E65DF', // Primary Action Purple
    400: '#907DFC',
    300: '#A196F8',
    200: '#C5BEFA',
    100: '#E8E5FD', // Lightest Purple
  },
  accent: {
    // Gold/Yellow for highlights
    500: '#FFD700',
    400: '#FFDE33',
  },
  // You can also define neutral colors, text colors, etc.
  // Chakra's default dark mode is quite good, but you can customize it further.
};

const config = {
  initialColorMode: 'dark', // Default to dark mode
  useSystemColorMode: false, // Optionally, respect system preference
};

const theme = extendTheme({ colors, config });

// Wasp provides its own QueryClient setup.
// If you need to customize it, you can.
// For now, we'll assume Wasp handles QueryClientProvider internally.
// If direct usage of @tanstack/react-query is needed outside Wasp hooks,
// then a QueryClientProvider here would be necessary.
// Wasp's `useQuery` and `useAction` already work within its context.

// Create a client (only if you need to use @tanstack/react-query directly)
// const queryClient = new QueryClient();


function App({ children }) { // Wasp injects page content as `children`
  return (
    // <QueryClientProvider client={queryClient}> // Only if using @tanstack/react-query directly
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {/* Layout will wrap the page content (children) */}
      <Layout> 
        {children} 
      </Layout>
    </ChakraProvider>
    // </QueryClientProvider>
  );
}

export default App;