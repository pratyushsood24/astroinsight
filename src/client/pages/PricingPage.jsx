// astroinsight/src/client/pages/PricingPage.jsx
import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  Button,
  List,
  ListItem,
  ListIcon,
  useColorModeValue,
  Divider,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';
import { Link as RouterLink } from 'react-router-dom';
import useAuth from '@wasp/auth/useAuth';
import createCheckoutSession from '@wasp/actions/createCheckoutSession';
import { useAction } from '@wasp/actions';
import { useToast } from '@chakra-ui/react';
import { STRIPE_BASIC_PLAN_PRICE_ID, STRIPE_PREMIUM_PLAN_PRICE_ID } from '../utils/constants'; // We'll create this

const PlanCard = ({ planName, price, features, ctaText, planId, onSubscribe, isLoading, isCurrentPlan }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const popularBadge = planName === 'Premium Plan' ? (
    <Box
      position="absolute"
      top="-1px"
      left="-1px"
      py={1}
      px={3}
      bg="brand.500"
      color="white"
      fontSize="xs"
      fontWeight="bold"
      borderTopLeftRadius="lg"
      borderBottomRightRadius="lg"
    >
      POPULAR
    </Box>
  ) : null;

  return (
    <VStack
      p={8}
      bg={cardBg}
      borderRadius="lg"
      boxShadow="lg"
      border={planName === 'Premium Plan' ? '2px' : '1px'}
      borderColor={planName === 'Premium Plan' ? 'brand.500' : useColorModeValue('gray.200', 'gray.600')}
      spacing={6}
      align="stretch"
      position="relative"
      minH="450px" // Ensure cards have similar height
      justifyContent="space-between"
    >
      {popularBadge}
      <VStack spacing={2} align="center" flexGrow={1}>
        <Heading size="lg" mt={popularBadge ? 4 : 0}>{planName}</Heading>
        <Text fontSize="4xl" fontWeight="bold">
          ${price}
          <Text as="span" fontSize="md" color="gray.500">/month</Text>
        </Text>
        <List spacing={3} textAlign="left" py={4} width="100%">
          {features.map((feature, index) => (
            <ListItem key={index}>
              <ListIcon as={CheckCircleIcon} color="green.500" />
              {feature}
            </ListItem>
          ))}
        </List>
      </VStack>
      {isCurrentPlan ? (
        <Button colorScheme="green" variant="outline" isDisabled>Current Plan</Button>
      ) : (
        <Button
            colorScheme="purple"
            bg="brand.600"
            _hover={{ bg: 'brand.700' }}
            onClick={() => onSubscribe(planId)}
            isLoading={isLoading}
        >
            {ctaText}
        </Button>
      )}
    </VStack>
  );
};

export function PricingPage() {
  const { data: user } = useAuth();
  const toast = useToast();
  const { currentUser } = {} // TODO: Wasp provides `user` via `useAuth`, need to fetch full user details if planId is on user entity.
  // For now, assuming `user.planId` might be available or we make a separate query.
  // Let's assume we get `currentUser.planId` from a query like `useQuery(getCurrentUser)`

  const { performAction: checkout, isLoading: isCheckoutLoading } = useAction(createCheckoutSession, {
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        toast({ title: "Error", description: "Could not retrieve Stripe session URL.", status: "error" });
      }
    },
    onError: (error) => {
      toast({
        title: 'Subscription Error',
        description: error.message || "Could not initiate subscription. Please try again.",
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleSubscribe = async (planId) => {
    if (!user) {
      // Redirect to signup/login if not authenticated
      toast({ title: "Please log in or sign up to subscribe.", status: "info" });
      // Consider redirecting: history.push('/login?redirect=/pricing');
      return;
    }
    await checkout({ planId });
  };
  
  // Mock current user plan for display purposes
  const currentUserPlanId = user?.planId; // This would come from `useQuery(getCurrentUser)`

  const plans = [
    {
      planName: 'Free Trial',
      price: '0',
      features: [
        '1 Free Birth Chart',
        '3 AI-Powered Insights (Claude Haiku)',
        'Basic Chart Analysis',
        'Limited Conversational Q&A',
        'Email Support',
      ],
      ctaText: user ? (currentUserPlanId === 'free_trial' || !currentUserPlanId ? 'Your Current Access' : 'Try Features') : 'Start Free Trial',
      planId: 'free_trial', // Not a Stripe plan, but internal
      isCurrent: currentUserPlanId === 'free_trial' || (!currentUserPlanId && user),
    },
    {
      planName: 'Basic Plan',
      price: '9.99',
      priceId: STRIPE_BASIC_PLAN_PRICE_ID,
      features: [
        'Up to 3 Birth Charts',
        '50 AI Credits/month (Claude Haiku)',
        'Detailed Birth Chart Reports',
        'Standard Conversational Q&A',
        'Email Support',
      ],
      ctaText: 'Choose Basic',
      planId: 'basic',
      isCurrent: currentUserPlanId === 'basic',
    },
    {
      planName: 'Premium Plan',
      price: '19.99',
      priceId: STRIPE_PREMIUM_PLAN_PRICE_ID,
      features: [
        'Unlimited Birth Charts',
        '200 AI Credits/month (Claude Sonnet)',
        'Advanced AI Insights & Predictions',
        'Compatibility Analysis',
        'Transit Forecasts',
        'Downloadable Reports (PDF)',
        'Priority Email Support',
      ],
      ctaText: 'Go Premium',
      planId: 'premium',
      isCurrent: currentUserPlanId === 'premium',
    },
  ];

  return (
    <Container maxW="container.lg" py={{ base: 12, md: 20 }}>
      <VStack spacing={6} textAlign="center" mb={12}>
        <Heading as="h1" size={{ base: 'xl', md: '2xl' }}>
          Find the Perfect Plan for Your Cosmic Journey
        </Heading>
        <Text fontSize={{ base: 'md', md: 'lg' }} color={useColorModeValue('gray.600', 'gray.400')} maxW="xl">
          Whether you're just starting or ready to dive deep, AstroInsight has a plan for you. All paid plans come with a 7-day money-back guarantee.
        </Text>
      </VStack>

      {!STRIPE_BASIC_PLAN_PRICE_ID || !STRIPE_PREMIUM_PLAN_PRICE_ID ? (
         <Alert status="warning" mb={8}>
            <AlertIcon />
            Pricing plans are not fully configured. Administrator needs to set Stripe Price IDs in the environment variables.
        </Alert>
      ) : null}

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8} alignItems="stretch">
        {plans.map((plan) => (
          <PlanCard
            key={plan.planName}
            planName={plan.planName}
            price={plan.price}
            features={plan.features}
            ctaText={plan.ctaText}
            planId={plan.planId}
            onSubscribe={plan.planId === 'free_trial' ? 
                () => { if (!user) window.location.href = '/signup'; } 
                : handleSubscribe
            }
            isLoading={isCheckoutLoading && plan.planId !== 'free_trial'}
            isCurrentPlan={plan.isCurrent && user && plan.planId !== 'free_trial'} // Don't mark free_trial as "current plan" button state
          />
        ))}
      </SimpleGrid>

      <Divider my={12} />

      <Box textAlign="center">
        <Heading size="lg" mb={4}>Frequently Asked Questions</Heading>
        <VStack spacing={4} align="start" maxW="container.md" margin="auto">
          <Box>
            <Text fontWeight="bold">Can I cancel my subscription anytime?</Text>
            <Text>Yes, you can cancel your subscription at any time from your account page. Your access will continue until the end of your current billing period.</Text>
          </Box>
          <Box>
            <Text fontWeight="bold">What are AI Credits?</Text>
            <Text>AI credits are used for generating detailed reports and engaging in conversational Q&A with our AI astrologer. Each interaction consumes a certain amount of credits based on complexity and model used.</Text>
          </Box>
          <Box>
            <Text fontWeight="bold">Is my payment information secure?</Text>
            <Text>Absolutely. All payments are processed by Stripe, a certified PCI Service Provider Level 1. We do not store your credit card details on our servers.</Text>
          </Box>
        </VStack>
      </Box>
    </Container>
  );
}