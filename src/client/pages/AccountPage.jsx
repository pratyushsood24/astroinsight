// astroinsight/src/client/pages/AccountPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Spinner,
  Divider,
  Tag,
  TagLabel,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  useColorModeValue,
} from '@chakra-ui/react';
import { useQuery } from '@wasp/queries';
import { useAction } from '@wasp/actions';
import getCurrentUser from '@wasp/queries/getCurrentUser';
import updateUserProfile from '@wasp/actions/updateUserProfile';
import manageSubscriptionAction from '@wasp/actions/manageSubscription';
import cancelSubscriptionAction from '@wasp/actions/cancelSubscription';
import deleteUserAccountAction from '@wasp/actions/deleteUserAccount';
import logout from '@wasp/auth/logout.js';
import { useForm } from 'react-hook-form';

export function AccountPage() {
  const { data: user, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery(getCurrentUser);
  const toast = useToast();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting: isProfileSubmitting } } = useForm();

  const { isOpen: isDeleteUserOpen, onOpen: onDeleteUserOpen, onClose: onDeleteUserClose } = useDisclosure();
  const cancelRef = React.useRef();

  useEffect(() => {
    if (user) {
      setValue('username', user.username || '');
      // setValue('email', user.email || ''); // Email might not be editable easily
    }
  }, [user, setValue]);

  const updateProfile = useAction(updateUserProfile, {
    onSuccess: () => {
      toast({ title: "Profile updated successfully!", status: "success", duration: 3000, isClosable: true });
      refetchUser();
    },
    onError: (error) => {
      toast({ title: "Error updating profile.", description: error.message, status: "error", duration: 5000, isClosable: true });
    },
  });

  const manageSubscription = useAction(manageSubscriptionAction, {
    onSuccess: (data) => {
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      } else {
        toast({ title: "Error", description: "Could not retrieve Stripe portal URL.", status: "error" });
      }
    },
    onError: (error) => {
      toast({ title: "Error accessing subscription portal.", description: error.message, status: "error" });
    },
  });

  const cancelSubscription = useAction(cancelSubscriptionAction, {
      onSuccess: (data) => {
          toast({ 
              title: "Subscription Cancellation Initiated", 
              description: data.message || "Your subscription will be canceled at the end of the current period.", 
              status: "info", 
              duration: 7000, 
              isClosable: true 
            });
          refetchUser(); // Refetch user to update subscription status display
      },
      onError: (error) => {
          toast({ title: "Error Canceling Subscription", description: error.message, status: "error" });
      }
  });

  const deleteAccount = useAction(deleteUserAccountAction, {
      onSuccess: async () => {
          toast({ title: "Account Deletion Initiated", description: "Your account is being deleted. You will be logged out.", status: "info", duration: 5000 });
          await logout(); // Wasp's logout
          window.location.href = "/"; // Redirect to home
      },
      onError: (error) => {
          toast({ title: "Error Deleting Account", description: error.message, status: "error" });
          onDeleteUserClose();
      }
  });


  const onSubmitProfile = async (data) => {
    await updateProfile(data);
  };

  const cardBg = useColorModeValue('white', 'gray.700');

  if (userLoading) return <Container centerContent py={10}><Spinner /></Container>;
  if (userError) return <Container centerContent py={10}><Text color="red.500">Error loading user data: {userError.message}</Text></Container>;
  if (!user) return <Container centerContent py={10}><Text>Please log in to view your account.</Text></Container>;

  const planColors = {
    free_trial: 'gray',
    basic: 'teal',
    premium: 'purple',
  };
  const planName = user.planId ? user.planId.charAt(0).toUpperCase() + user.planId.slice(1) : 'Free Trial';


  return (
    <Container maxW="container.md" py={{ base: 8, md: 12 }}>
      <Heading as="h1" size="xl" mb={8} textAlign="center">Your Account</Heading>

      <VStack spacing={8} align="stretch">
        {/* Profile Information */}
        <Box p={6} bg={cardBg} borderRadius="lg" boxShadow="md">
          <Heading size="lg" mb={6}>Profile Information</Heading>
          <form onSubmit={handleSubmit(onSubmitProfile)}>
            <VStack spacing={4}>
              <FormControl id="email" isReadOnly>
                <FormLabel>Email</FormLabel>
                <Input type="email" value={user.email || ''} readOnly _disabled={{ opacity: 0.7 }} />
              </FormControl>
              <FormControl id="username" isInvalid={errors.username}>
                <FormLabel>Username</FormLabel>
                <Input
                  type="text"
                  {...register('username', {
                    minLength: { value: 3, message: 'Username must be at least 3 characters' },
                    maxLength: { value: 50, message: 'Username too long' }
                  })}
                  defaultValue={user.username || ''}
                />
                {errors.username && <Text color="red.500" fontSize="sm">{errors.username.message}</Text>}
              </FormControl>
              <Button type="submit" colorScheme="purple" isLoading={isProfileSubmitting || updateProfile.isLoading} alignSelf="flex-start">
                Save Profile
              </Button>
            </VStack>
          </form>
        </Box>

        {/* Subscription Management */}
        <Box p={6} bg={cardBg} borderRadius="lg" boxShadow="md">
          <Heading size="lg" mb={6}>Subscription Details</Heading>
          <VStack spacing={4} align="start">
            <HStack>
              <Text fontWeight="bold">Current Plan:</Text>
              <Tag size="lg" colorScheme={planColors[user.planId] || 'gray'} borderRadius="full">
                <TagLabel>{planName}</TagLabel>
              </Tag>
            </HStack>
            {user.subscriptionStatus && (
                 <HStack><Text fontWeight="bold">Status:</Text> <Text>{user.subscriptionStatus.charAt(0).toUpperCase() + user.subscriptionStatus.slice(1)}</Text></HStack>
            )}
            {user.subscriptionEndsAt && (
                <HStack><Text fontWeight="bold">Renews/Expires On:</Text> <Text>{new Date(user.subscriptionEndsAt).toLocaleDateString()}</Text></HStack>
            )}
             <HStack><Text fontWeight="bold">AI Credits Remaining:</Text> <Text>{user.credits ?? 'N/A'}</Text></HStack>

            {user.stripeCustomerId && (user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trialing' || user.subscriptionStatus === 'past_due') ? (
              <HStack spacing={4} mt={4}>
                <Button colorScheme="blue" onClick={() => manageSubscription()} isLoading={manageSubscription.isLoading}>
                  Manage Subscription
                </Button>
                {user.subscriptionStatus !== 'canceled' &&  // Don't show if already set to cancel
                    <Button 
                        colorScheme="orange" 
                        variant="outline" 
                        onClick={() => cancelSubscription()}
                        isLoading={cancelSubscription.isLoading}
                        >
                        Cancel Subscription
                    </Button>
                }
              </HStack>
            ) : (
              <Text>
                {user.planId !== 'premium' ? 'You are not currently on a paid subscription.' : ''}
                <Button as={RouterLink} to="/pricing" colorScheme="purple" variant="link" ml={2}>View Pricing Plans</Button>
              </Text>
            )}
          </VStack>
        </Box>

        {/* Danger Zone */}
        <Box p={6} bg={useColorModeValue('red.50', 'red.900')} borderRadius="lg" boxShadow="md" borderColor="red.500" borderWidth="1px">
          <Heading size="lg" mb={6} color="red.500">Danger Zone</Heading>
          <VStack spacing={4} align="start">
            <Text>Be careful, these actions are irreversible.</Text>
            <Button 
                colorScheme="red" 
                variant="outline" 
                onClick={onDeleteUserOpen}
                isLoading={deleteAccount.isLoading}
            >
              Delete My Account
            </Button>
          </VStack>
        </Box>
      </VStack>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteUserOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteUserClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Account
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete your account? All your data, including birth charts and conversations, will be permanently removed. This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteUserClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={() => deleteAccount()} ml={3} isLoading={deleteAccount.isLoading}>
                Delete Account
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
}