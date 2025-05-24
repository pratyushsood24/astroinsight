// astroinsight/src/client/pages/LoginPage.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Heading, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import LoginForm from '../components/auth/LoginForm'; // We'll create this

export function LoginPage() {
  const formBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Container maxW="container.sm" py={{ base: 12, md: 24 }} centerContent>
      <VStack spacing={8} w="100%">
        <VStack spacing={2} textAlign="center">
          <Heading as="h1" size="xl">Welcome Back to AstroInsight</Heading>
          <Text>Log in to continue your cosmic exploration.</Text>
        </VStack>
        <Box bg={formBg} p={8} borderRadius="lg" boxShadow="xl" w="100%">
          <LoginForm />
        </Box>
        <Text>
          Don't have an account?{' '}
          <RouterLink to="/signup" style={{ color: useColorModeValue('purple.600', 'purple.300'), fontWeight: 'bold' }}>
            Sign up here
          </RouterLink>
        </Text>
      </VStack>
    </Container>
  );
}