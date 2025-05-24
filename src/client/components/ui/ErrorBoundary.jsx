// astroinsight/src/client/components/ui/ErrorBoundary.jsx
import React from 'react';
import { Box, Heading, Text, Button, VStack, Code, useColorModeValue } from '@chakra-ui/react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    // Example: logErrorToMyService(error, errorInfo);
  }

  render() {
    const cardBg = useColorModeValue('red.50', 'red.900');
    const textColor = useColorModeValue('red.700', 'red.100');

    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Box p={8} m="auto" mt={20} maxW="container.md" textAlign="center">
          <VStack spacing={6} bg={cardBg} p={8} borderRadius="lg" boxShadow="lg">
            <Heading size="xl" color={textColor}>😢 Oops! Something went wrong.</Heading>
            <Text fontSize="lg" color={textColor}>
              We're sorry for the inconvenience. Please try refreshing the page, or contact support if the problem persists.
            </Text>
            <Button colorScheme="purple" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box textAlign="left" mt={6} p={4} bg={useColorModeValue('gray.100', 'gray.700')} borderRadius="md" overflowX="auto">
                <Text fontWeight="bold">Error Details (Development Mode):</Text>
                <Text as="pre" fontSize="sm" whiteSpace="pre-wrap">
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                    <Text as="pre" fontSize="sm" whiteSpace="pre-wrap" mt={2}>
                        Component Stack: {this.state.errorInfo.componentStack}
                    </Text>
                )}
              </Box>
            )}
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;