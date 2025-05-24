// astroinsight/src/client/components/ui/LoadingSpinner.jsx
import React from 'react';
import { Spinner, Center, Text, VStack } from '@chakra-ui/react';

export default function LoadingSpinner({ size = 'xl', message, fullPage = false }) {
  const spinnerComponent = (
    <VStack spacing={4}>
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color="brand.500"
        size={size}
      />
      {message && <Text fontSize="lg" color="brand.500">{message}</Text>}
    </VStack>
  );

  if (fullPage) {
    return (
      <Center h="80vh"> {/* Adjust height as needed */}
        {spinnerComponent}
      </Center>
    );
  }

  return spinnerComponent;
}