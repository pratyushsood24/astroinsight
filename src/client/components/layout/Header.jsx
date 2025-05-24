// astroinsight/src/client/components/layout/Header.jsx
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Flex,
  HStack,
  Button,
  Text,
  useColorModeValue,
  useColorMode,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Avatar,
  Container,
} from '@chakra-ui/react';
import { MoonIcon, SunIcon, ChevronDownIcon } from '@chakra-ui/icons';
import useAuth from '@wasp/auth/useAuth';
import logout from '@wasp/auth/logout';
import { useQuery } from '@wasp/queries';
import getCurrentUser from '@wasp/queries/getCurrentUser'; // To get username/avatar if available

const NavLink = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  const activeColor = useColorModeValue('brand.600', 'brand.300');
  const inactiveColor = useColorModeValue('gray.600', 'gray.200');

  return (
    <Button
      as={RouterLink}
      to={to}
      variant="ghost"
      color={isActive ? activeColor : inactiveColor}
      fontWeight={isActive ? 'bold' : 'normal'}
      _hover={{
        textDecoration: 'none',
        bg: useColorModeValue('brand.50', 'brand.900'),
      }}
      px={3}
      py={2}
      rounded={'md'}
    >
      {children}
    </Button>
  );
};

export default function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { data: user } = useAuth(); // Basic auth status
  const { data: currentUser } = useQuery(getCurrentUser, {}, { enabled: !!user }); // Full user details

  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box bg={headerBg} borderBottom="1px" borderColor={borderColor} position="sticky" top="0" zIndex="sticky">
      <Container maxW="container.xl">
        <Flex h={16} alignItems={'center'} justifyContent={'space-between'}>
          <HStack spacing={8} alignItems={'center'}>
            <RouterLink to="/">
              <Text fontSize="2xl" fontWeight="bold" color="brand.500">
                AstroInsight ✨
              </Text>
            </RouterLink>
            <HStack as={'nav'} spacing={4} display={{ base: 'none', md: 'flex' }}>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <NavLink to="/pricing">Pricing</NavLink>
              {/* Add more links like About, Blog, etc. if needed */}
            </HStack>
          </HStack>

          <Flex alignItems={'center'}>
            <IconButton
              size={'md'}
              icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
              aria-label={'Toggle Color Mode'}
              onClick={toggleColorMode}
              mr={4}
              variant="ghost"
            />
            {user ? (
              <Menu>
                <MenuButton
                  as={Button}
                  rounded={'full'}
                  variant={'link'}
                  cursor={'pointer'}
                  minW={0}
                  rightIcon={<ChevronDownIcon />}
                >
                  <Avatar
                    size={'sm'}
                    name={currentUser?.username || currentUser?.email}
                    // src={currentUser?.avatarUrl} // If you add avatar URLs
                    bg="brand.500" // Placeholder avatar color
                    color="white"
                  />
                </MenuButton>
                <MenuList alignItems={'center'} bg={useColorModeValue('white', 'gray.900')}>
                  <MenuItem as={RouterLink} to="/account">
                    My Account
                  </MenuItem>
                  <MenuItem as={RouterLink} to="/dashboard">
                    Dashboard
                  </MenuItem>
                  <MenuDivider />
                  <MenuItem onClick={logout}>Logout</MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <HStack spacing={2}>
                <Button as={RouterLink} to="/login" variant="ghost" size="sm">
                  Log In
                </Button>
                <Button
                  as={RouterLink}
                  to="/signup"
                  colorScheme="purple"
                  bg="brand.600"
                  _hover={{ bg: 'brand.700' }}
                  size="sm"
                >
                  Sign Up
                </Button>
              </HStack>
            )}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}