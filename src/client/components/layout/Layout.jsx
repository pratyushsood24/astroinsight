// astroinsight/src/client/components/layout/Layout.jsx
import React from 'react';
import { Flex, Box, useColorModeValue } from '@chakra-ui/react';
import Header from './header';
import Footer from './Footer';
import ErrorBoundary from '../ui/ErrorBoundary'; // We'll create this

export default function Layout({ children }) {
  const mainBg = useColorModeValue('gray.100', 'gray.800'); // Slightly different from deepest dark for contrast
  const contentBg = useColorModeValue('white', 'gray.900'); // Content area bg

  return (
    <Flex direction="column" minH="100vh" bg={mainBg}>
      <Header />
      <Box as="main" flex="1" width="100%" bg={contentBg}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </Box>
      <Footer />
    </Flex>
  );
}
