// astroinsight/src/client/pages/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useToast,
  Button,
  Spinner,
  Text,
  Flex,
  SimpleGrid,
  IconButton,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon, ViewIcon } from '@chakra-ui/icons';
import { Link as RouterLink, useLocation } from 'react-router-dom'; // Wasp Link
import useAuth from '@wasp/auth/useAuth';
import { useQuery } from '@wasp/queries';
import { useAction } from '@wasp/actions';
import getUserBirthCharts from '@wasp/queries/getUserBirthCharts';
import getUserConversations from '@wasp/queries/getUserConversations';
import deleteBirthChartAction from '@wasp/actions/deleteBirthChart';
import BirthChartForm from '../components/astrology/BirthChartForm'; // We'll create this
import AstrologyChat from '../components/astrology/AstrologyChat'; // We'll create this
import KundaliChart from '../components/astrology/KundaliChart'; // We'll create this
import AstrologyReport from '../components/astrology/AstrologyReport'; // We'll create this
import getCurrentUser from '@wasp/queries/getCurrentUser';

// A card for displaying a birth chart summary
const BirthChartCard = ({ chart, onView, onDelete }) => (
  <Box borderWidth="1px" borderRadius="lg" p={4} shadow="md">
    <Flex justifyContent="space-between" alignItems="center">
      <Box>
        <Heading size="md">{chart.name}</Heading>
        <Text fontSize="sm" color="gray.500">
          {new Date(chart.birthDate).toLocaleDateString()} - {chart.birthLocation}
        </Text>
      </Box>
      <Box>
        <IconButton icon={<ViewIcon />} aria-label="View Chart" onClick={() => onView(chart.id)} mr={2} variant="ghost" />
        <IconButton icon={<DeleteIcon />} colorScheme="red" aria-label="Delete Chart" onClick={() => onDelete(chart.id)} variant="ghost" />
      </Box>
    </Flex>
  </Box>
);

// A card for displaying a conversation summary
const ConversationCard = ({ conversation, onView }) => (
  <Box borderWidth="1px" borderRadius="lg" p={4} shadow="md">
     <Flex justifyContent="space-between" alignItems="center">
        <Box>
            <Heading size="sm">{conversation.title}</Heading>
            <Text fontSize="xs" color="gray.500">
            Last updated: {new Date(conversation.updatedAt).toLocaleString()} | Messages: {conversation._count.messages}
            </Text>
        </Box>
        <IconButton icon={<ViewIcon />} aria-label="View Conversation" onClick={() => onView(conversation)} variant="ghost" />
    </Flex>
  </Box>
);


export function DashboardPage() {
  const { data: user, isLoading: authLoading } = useAuth();
  const { data: currentUserData, isLoading: currentUserLoading } = useQuery(getCurrentUser);
  const toast = useToast();
  const location = useLocation();

  const [isChartFormOpen, setIsChartFormOpen] = useState(false);
  const [selectedChartIdForChat, setSelectedChartIdForChat] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [viewingChartDetail, setViewingChartDetail] = useState(null); // For Kundali/Report view

  const { data: birthCharts, isLoading: chartsLoading, refetch: refetchBirthCharts } = useQuery(getUserBirthCharts);
  const { data: conversations, isLoading: convosLoading, refetch: refetchConversations } = useQuery(getUserConversations); // Get all conversations
  
  const deleteChart = useAction(deleteBirthChartAction, {
    onSuccess: () => {
      toast({ title: "Birth chart deleted.", status: "success", duration: 3000, isClosable: true });
      refetchBirthCharts();
      if (viewingChartDetail && viewingChartDetail.id === chartToDeleteId) {
        setViewingChartDetail(null); // Clear view if deleted chart was being viewed
      }
      setChartToDeleteId(null); // Clear after deletion
      onDeleteDialogClose();
    },
    onError: (error) => {
      toast({ title: "Error deleting chart.", description: error.message, status: "error", duration: 5000, isClosable: true });
      onDeleteDialogClose();
    }
  });

  const { isOpen: isDeleteOpen, onOpen: onDeleteDialogOpen, onClose: onDeleteDialogClose } = useDisclosure();
  const [chartToDeleteId, setChartToDeleteId] = useState(null);
  const cancelRef = React.useRef();

  const handleDeleteChartClick = (chartId) => {
    setChartToDeleteId(chartId);
    onDeleteDialogOpen();
  };

  const confirmDeleteChart = () => {
    if (chartToDeleteId) {
      deleteChart({ id: chartToDeleteId });
    }
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('subscription_success') === 'true') {
      toast({
        title: 'Subscription Successful!',
        description: "Welcome to your new plan!",
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      // Optionally, remove query params from URL
      // window.history.replaceState({}, document.title, "/dashboard");
    }
  }, [location.search, toast]);

  if (authLoading || currentUserLoading) {
    return <Spinner />;
  }

  if (!user) {
    // Should be redirected by Wasp's auth, but as a fallback:
    return <Text>Please log in to view the dashboard.</Text>;
  }

  const handleChartCreated = () => {
    setIsChartFormOpen(false);
    refetchBirthCharts();
    refetchConversations(); // New chart might create an initial conversation
  };

  const handleViewChartDetail = (chartId) => {
    const chart = birthCharts.find(c => c.id === chartId);
    setViewingChartDetail(chart); // Store the basic chart info
    setSelectedChartIdForChat(null); // Close chat if open
    setSelectedConversation(null); // Close conversation if open
  };

  const handleStartChat = (chartId) => {
    setSelectedChartIdForChat(chartId);
    setSelectedConversation(null); // If a full conversation was open, close it
    setViewingChartDetail(null); // Close chart detail if open
  };
  
  const handleViewConversation = (conversation) => {
    setSelectedConversation(conversation);
    setSelectedChartIdForChat(null); // Close new chat form if open
    setViewingChartDetail(null); // Close chart detail if open
  }


  // Main content to display based on selections
  let mainContent;
  if (isChartFormOpen) {
    mainContent = <BirthChartForm onSuccess={handleChartCreated} onCancel={() => setIsChartFormOpen(false)} />;
  } else if (selectedConversation) {
    mainContent = <AstrologyChat birthChartId={selectedConversation.birthChartId} conversationId={selectedConversation.id} key={selectedConversation.id} />;
  } else if (selectedChartIdForChat) {
    mainContent = <AstrologyChat birthChartId={selectedChartIdForChat} key={selectedChartIdForChat} />;
  } else if (viewingChartDetail) {
    // Show Kundali and Report for the selected chart
    // This assumes KundaliChart and AstrologyReport take chartId or full chart data
    mainContent = (
      <Box>
        <Heading size="lg" mb={4}>Details for {viewingChartDetail.name}</Heading>
        <Tabs variant="enclosed-colored" colorScheme="purple" isLazy>
          <TabList>
            <Tab>Kundali Chart</Tab>
            <Tab>Generated Reports</Tab> {/* Could list reports/conversations for this chart */}
            {/* <Tab>New AI Insight</Tab> */}
          </TabList>
          <TabPanels>
            <TabPanel>
              <KundaliChart chartId={viewingChartDetail.id} />
            </TabPanel>
            <TabPanel>
              {/* List conversations related to this chart, or specific reports */}
              <AstrologyReport chartId={viewingChartDetail.id} />
            </TabPanel>
            {/* <TabPanel>
              <AstrologyChat birthChartId={viewingChartDetail.id} />
            </TabPanel> */}
          </TabPanels>
        </Tabs>
      </Box>
    );
  } else {
    mainContent = (
      <Box textAlign="center" py={10}>
        <Heading size="md" mb={4}>Welcome to your AstroInsight Dashboard, {currentUserData?.username || currentUserData?.email}!</Heading>
        <Text>Select a chart or conversation to view, or create a new birth chart.</Text>
        <Button mt={4} colorScheme="purple" onClick={() => setIsChartFormOpen(true)} leftIcon={<AddIcon />}>
            Create New Birth Chart
        </Button>
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Flex direction={{ base: 'column', md: 'row' }} gap={6}>
        {/* Sidebar / Navigation */}
        <Box w={{ base: 'full', md: '300px' }} 
             p={4} 
             borderWidth="1px" 
             borderRadius="lg" 
             shadow="sm"
             alignSelf="flex-start" // Keep sidebar from stretching
             minH={{md: "calc(100vh - 200px)"}} // Example height
        >
          <Heading size="md" mb={4}>Your Charts</Heading>
          <Button leftIcon={<AddIcon />} colorScheme="purple" size="sm" mb={4} onClick={() => setIsChartFormOpen(true)} isFullWidth>
            New Chart
          </Button>
          {chartsLoading ? <Spinner /> : (
            <VStack spacing={3} align="stretch" mb={6}>
              {birthCharts && birthCharts.length > 0 ? birthCharts.map(chart => (
                <BirthChartCard key={chart.id} chart={chart} onView={handleViewChartDetail} onDelete={handleDeleteChartClick} />
              )) : <Text fontSize="sm">No birth charts yet.</Text>}
            </VStack>
          )}

          <Heading size="md" mt={8} mb={4}>Conversations</Heading>
          {convosLoading ? <Spinner /> : (
             <VStack spacing={3} align="stretch">
              {conversations && conversations.length > 0 ? conversations.map(convo => (
                <ConversationCard key={convo.id} conversation={convo} onView={handleViewConversation} />
              )) : <Text fontSize="sm">No conversations yet.</Text>}
            </VStack>
          )}
        </Box>

        {/* Main Content Area */}
        <Box flex="1" p={4} borderWidth="1px" borderRadius="lg" shadow="sm">
          {mainContent}
        </Box>
      </Flex>

      {/* Deletion Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteDialogClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Birth Chart
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to delete this birth chart? This action cannot be undone and will delete associated conversations.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteDialogClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDeleteChart} ml={3} isLoading={deleteChart.isLoading}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
}