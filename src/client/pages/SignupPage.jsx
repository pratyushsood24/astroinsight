// astroinsight/src/client/pages/SignupPage.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Container, Heading, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import SignupForm from '../components/auth/SignupForm'; // We'll create this

export function SignupPage() {
  const formBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Container maxW="container.sm" py={{ base: 12, md: 24 }} centerContent>
      <VStack spacing={8} w="100%">
        <VStack spacing={2} textAlign="center">
          <Heading as="h1" size="xl">Join AstroInsight Today</Heading>
          <Text>Create your account and start discovering your astrological path.</Text>
        </VStack>
        <Box bg={formBg} p={8} borderRadius="lg" boxShadow="xl" w="100%">
          <SignupForm />
        </Box>
        <Text>
          Already have an account?{' '}
          <RouterLink to="/login" style={{ color: useColorModeValue('purple.600', 'purple.300'), fontWeight: 'bold' }}>
            Log in here
          </RouterLink>
        </Text>
      </VStack>
    </Container>
  );
}