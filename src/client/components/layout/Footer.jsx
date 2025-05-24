// astroinsight/src/client/components/layout/Footer.jsx
import React from 'react';
import {
  Box,
  Container,
  Stack,
  Text,
  Link,
  useColorModeValue,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { FaTwitter, FaGithub, FaLinkedin } from 'react-icons/fa'; // Example social icons

export default function Footer() {
  const footerBg = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const linkColor = useColorModeValue('brand.600', 'brand.300');

  return (
    <Box bg={footerBg} color={textColor}>
      <Container
        as={Stack}
        maxW={'container.xl'}
        py={10}
        spacing={8}
        justify={'center'}
        align={'center'}
      >
        <Text fontSize="2xl" fontWeight="bold" color="brand.500">
          AstroInsight
        </Text>
        <Stack direction={'row'} spacing={6}>
          <Link as={RouterLinkWrapper} to="/" color={linkColor}>Home</Link>
          <Link as={RouterLinkWrapper} to="/pricing" color={linkColor}>Pricing</Link>
          <Link as={RouterLinkWrapper} to="/dashboard" color={linkColor}>Dashboard</Link>
          {/* Add links to Terms of Service, Privacy Policy, etc. */}
          <Link href={'/terms'} color={linkColor}>Terms of Service</Link>
          <Link href={'/privacy'} color={linkColor}>Privacy Policy</Link>
        </Stack>
        
        <HStack spacing={4}>
            <IconButton as="a" href="https://twitter.com/yourprofile" aria-label="Twitter" icon={<FaTwitter />} variant="ghost" color={linkColor} />
            <IconButton as="a" href="https://github.com/yourprofile/astroinsight" aria-label="GitHub" icon={<FaGithub />} variant="ghost" color={linkColor} />
            <IconButton as="a" href="https://linkedin.com/company/yourprofile" aria-label="LinkedIn" icon={<FaLinkedin />} variant="ghost" color={linkColor} />
        </HStack>

        <Text fontSize={'sm'} textAlign="center">
          © {new Date().getFullYear()} AstroInsight. All rights reserved.
          <br />
          Astrological insights are for guidance and entertainment purposes only.
        </Text>
      </Container>
    </Box>
  );
}

// Helper to use Chakra Link with React Router Link (Wasp's Link)
import { Link as WaspLink } from 'react-router-dom';
const RouterLinkWrapper = React.forwardRef((props, ref) => (
  <WaspLink ref={ref} {...props} />
));