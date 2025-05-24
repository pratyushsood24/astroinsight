// astroinsight/src/client/pages/HomePage.jsx
import React from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Wasp provides Link
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Flex,
  Image,
} from '@chakra-ui/react';
import { StarIcon, ChatIcon, LockIcon, CheckCircleIcon } from '@chakra-ui/icons';
import { FaUserAstronaut, FaChartBar, FaStripeS } from 'react-icons/fa';
import useAuth from '@wasp/auth/useAuth'; // Wasp's auth hook

const Feature = ({ title, text, icon }) => {
  return (
    <HStack align={'top'} spacing={4}>
      <Flex
        w={12}
        h={12}
        align={'center'}
        justify={'center'}
        rounded={'full'}
        bg={useColorModeValue('brand.100', 'brand.900')}
        color={'brand.500'}
        mb={1}>
        {icon}
      </Flex>
      <VStack align={'start'}>
        <Text fontWeight={600}>{title}</Text>
        <Text color={useColorModeValue('gray.600', 'gray.400')}>{text}</Text>
      </VStack>
    </HStack>
  );
};

const TestimonialCard = ({ name, role, testimonial, avatar }) => {
  return (
    <VStack
      bg={useColorModeValue('gray.50', 'gray.700')}
      p={6}
      rounded="lg"
      align="start"
      spacing={4}
      boxShadow="md"
    >
      <HStack>
        {avatar && <Image borderRadius="full" boxSize="40px" src={avatar} alt={name} />}
        <Box>
          <Text fontWeight="bold">{name}</Text>
          <Text fontSize="sm" color={useColorModeValue('gray.500', 'gray.400')}>{role}</Text>
        </Box>
      </HStack>
      <Text fontStyle="italic">"{testimonial}"</Text>
    </VStack>
  );
};


export function HomePage() {
  const { data: user } = useAuth();
  const heroBg = useColorModeValue('brand.50', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  return (
    <Box>
      {/* Hero Section */}
      <Box bg={heroBg} py={{ base: 20, md: 28 }}>
        <Container maxW={'container.lg'}>
          <VStack spacing={6} textAlign="center">
            <Heading as="h1" size={{ base: '2xl', md: '3xl' }} fontWeight="bold">
              Unlock Your Cosmic Blueprint with <Text as="span" color="brand.500">AstroInsight</Text>
            </Heading>
            <Text fontSize={{ base: 'lg', md: 'xl' }} color={textColor} maxW="2xl">
              Discover personalized astrological insights powered by advanced AI. Understand your birth chart, explore your life path, and navigate your future with clarity.
            </Text>
            <HStack spacing={4}>
              <Button
                as={RouterLink}
                to={user ? "/dashboard" : "/signup"}
                colorScheme="purple"
                bg="brand.600"
                _hover={{ bg: 'brand.700' }}
                size="lg"
                px={8}
              >
                {user ? "Go to Dashboard" : "Get Started Free"}
              </Button>
              <Button as={RouterLink} to="/pricing" variant="outline" colorScheme="purple" size="lg" px={8}>
                View Pricing
              </Button>
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxW={'container.lg'} py={{ base: 16, md: 24 }}>
        <VStack spacing={4} mb={12} textAlign="center">
          <Text color="brand.500" fontWeight="semibold">DISCOVER YOURSELF</Text>
          <Heading as="h2" size="xl">Why Choose AstroInsight?</Heading>
          <Text color={useColorModeValue('gray.600', 'gray.400')} maxW="lg">
            We combine ancient astrological wisdom with cutting-edge AI to provide you with unparalleled accuracy and depth.
          </Text>
        </VStack>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10}>
          <Feature
            icon={<Icon as={FaUserAstronaut} w={8} h={8} />}
            title={'Personalized Birth Charts'}
            text={'Generate accurate natal charts using Swiss Ephemeris and get detailed interpretations unique to you.'}
          />
          <Feature
            icon={<Icon as={ChatIcon} w={8} h={8} />}
            title={'AI-Powered Insights'}
            text={'Engage in conversational Q&A with our Claude AI astrologer to explore your chart and life questions.'}
          />
          <Feature
            icon={<Icon as={FaChartBar} w={8} h={8} />}
            title={'Predictions & Compatibility'}
            text={'Understand current transits, future trends, and analyze relationship dynamics with our advanced reports.'}
          />
          <Feature
            icon={<Icon as={LockIcon} w={8} h={8} />}
            title={'Secure & Private'}
            text={'Your birth data and personal information are kept confidential and secure.'}
          />
          <Feature
            icon={<Icon as={FaStripeS} w={8} h={8} />}
            title={'Flexible Subscriptions'}
            text={'Choose a plan that fits your needs, with options for free trials and premium features managed by Stripe.'}
          />
          <Feature
            icon={<Icon as={CheckCircleIcon} w={8} h={8} />}
            title={'Professional & Modern UI'}
            text={'Enjoy a beautifully designed, intuitive, and responsive experience on any device.'}
          />
        </SimpleGrid>
      </Container>

      {/* Testimonials Section */}
      <Box bg={useColorModeValue('gray.100', 'gray.900')} py={{ base: 16, md: 24 }}>
        <Container maxW={'container.lg'}>
          <VStack spacing={4} mb={12} textAlign="center">
            <Text color="brand.500" fontWeight="semibold">WHAT OUR USERS SAY</Text>
            <Heading as="h2" size="xl">Voices of Insight</Heading>
          </VStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
            <TestimonialCard
              name="Sarah L."
              role="Spiritual Seeker"
              testimonial="AstroInsight gave me the clearest understanding of my birth chart I've ever had. The AI chat is incredible for follow-up questions!"
              avatar="https://bit.ly/dan-abramov" // Placeholder
            />
            <TestimonialCard
              name="Mike R."
              role="Entrepreneur"
              testimonial="The transit forecasts have been invaluable for planning my business moves. Highly recommend the premium plan."
              avatar="https://bit.ly/kent-c-dodds" // Placeholder
            />
            <TestimonialCard
              name="Jessica P."
              role="Yoga Instructor"
              testimonial="I love the blend of Vedic and Western astrology. The remedial measures section offered practical advice I could implement immediately."
              avatar="https://bit.ly/ryan-florence" // Placeholder
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* Call to Action Section */}
      <Box bg={heroBg} py={{ base: 16, md: 24 }}>
        <Container maxW={'container.md'} textAlign="center">
          <Heading as="h2" size="xl" mb={4}>
            Ready to Begin Your Astrological Journey?
          </Heading>
          <Text fontSize="lg" color={textColor} mb={8}>
            Sign up today for a free trial and get your first AI-powered birth chart analysis.
          </Text>
          <Button
            as={RouterLink}
            to={user ? "/dashboard" : "/signup"}
            colorScheme="purple"
            bg="brand.600"
            _hover={{ bg: 'brand.700' }}
            size="lg"
            px={10}
            py={6}
          >
            {user ? "Explore Your Dashboard" : "Start Your Free Trial"}
          </Button>
        </Container>
      </Box>
    </Box>
  );
}