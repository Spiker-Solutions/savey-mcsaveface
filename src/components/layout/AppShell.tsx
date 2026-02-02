"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  AppShell as MantineAppShell,
  Burger,
  Group,
  NavLink,
  Stack,
  Text,
  Menu,
  Avatar,
  UnstyledButton,
  useMantineColorScheme,
  ActionIcon,
  Divider,
  rem,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  LayoutDashboard,
  PiggyBank,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  User,
  Palette,
  Sparkles,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Features",
    href: "/dashboard/features",
    icon: Sparkles,
    exact: false,
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    exact: false,
  },
];

export function AppShell({ children, user }: AppShellProps) {
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = usePathname();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/auth/signin" });
  };

  return (
    <MantineAppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <MantineAppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Link
              href="/dashboard"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Group gap="xs">
                <PiggyBank size={28} color="var(--mantine-color-blue-6)" />
                <Text size="lg" fw={700} visibleFrom="xs">
                  Savey McSaveface
                </Text>
              </Group>
            </Link>
          </Group>

          <Group gap="sm">
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <ActionIcon variant="default" size="lg" aria-label="Theme">
                  <Palette size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Theme</Menu.Label>
                <Menu.Item
                  leftSection={<Sun size={14} />}
                  onClick={() => setColorScheme("light")}
                >
                  Light
                </Menu.Item>
                <Menu.Item
                  leftSection={<Moon size={14} />}
                  onClick={() => setColorScheme("dark")}
                >
                  Dark
                </Menu.Item>
                <Menu.Item
                  leftSection={<Monitor size={14} />}
                  onClick={() => setColorScheme("auto")}
                >
                  System
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>

            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap="xs">
                    <Avatar
                      src={user?.image}
                      alt={user?.name || "User"}
                      radius="xl"
                      size="sm"
                    >
                      {user?.name?.[0]?.toUpperCase() || <User size={14} />}
                    </Avatar>
                    <Text size="sm" fw={500} visibleFrom="sm">
                      {user?.name || user?.email}
                    </Text>
                    <ChevronDown size={14} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{user?.email}</Menu.Label>
                <Menu.Item
                  component={Link}
                  href="/dashboard/settings"
                  leftSection={<Settings size={14} />}
                >
                  Settings
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<LogOut size={14} />}
                  onClick={handleSignOut}
                >
                  Sign out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </MantineAppShell.Header>

      <MantineAppShell.Navbar p="md">
        <Stack gap="xs">
          {navigation.map((item) => (
            <NavLink
              key={item.href}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={<item.icon size={18} />}
              active={
                item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)
              }
              onClick={close}
              style={{ borderRadius: "var(--mantine-radius-md)" }}
            />
          ))}
        </Stack>
      </MantineAppShell.Navbar>

      <MantineAppShell.Main
        style={{
          paddingBottom:
            "calc(var(--mantine-spacing-md) + env(safe-area-inset-bottom))",
        }}
      >
        {children}
      </MantineAppShell.Main>
    </MantineAppShell>
  );
}
