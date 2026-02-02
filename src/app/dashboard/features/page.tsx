import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Badge,
  ThemeIcon,
  SimpleGrid,
  Divider,
} from "@mantine/core";
import {
  Wallet,
  PieChart,
  Users,
  Calendar,
  Bell,
  Tags,
  Receipt,
  Camera,
  Sparkles,
  Clock,
  Filter,
  ArrowLeftRight,
  History,
  FileText,
} from "lucide-react";

export default async function FeaturesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const currentFeatures = [
    {
      icon: Wallet,
      title: "Budget Management",
      description:
        "Create and manage multiple budgets with customizable cycle periods (weekly, bi-weekly, monthly, or custom dates).",
      color: "blue",
    },
    {
      icon: PieChart,
      title: "Category Allocation",
      description:
        "Organize spending with categories using fixed amounts, percentages, or remaining balance allocation methods.",
      color: "green",
    },
    {
      icon: Users,
      title: "Collaborative Budgeting",
      description:
        "Invite family members or partners to share budgets with role-based permissions (Owner, Editor, Viewer).",
      color: "violet",
    },
    {
      icon: Calendar,
      title: "Expense Tracking",
      description:
        "Log expenses with dates, payees, descriptions, and category assignments. Edit or delete entries anytime.",
      color: "orange",
    },
    {
      icon: History,
      title: "Cycle History",
      description:
        "Navigate through past budget cycles to review historical spending patterns and category allocations.",
      color: "cyan",
    },
    {
      icon: Tags,
      title: "Tags & Payees",
      description:
        "Organize expenses with custom tags and manage a list of payees for quick expense entry.",
      color: "pink",
    },
    {
      icon: Filter,
      title: "Advanced Filtering",
      description:
        "Filter expenses by category, payee, date range, amount, and creator to find exactly what you need.",
      color: "teal",
    },
    {
      icon: ArrowLeftRight,
      title: "Category Reassignment",
      description:
        "Safely delete categories or payees by reassigning associated expenses to another option.",
      color: "grape",
    },
  ];

  const upcomingFeatures = [
    {
      icon: Camera,
      title: "Receipt Scanner",
      description:
        "Take photos of receipts and automatically extract amounts, payees, and item details using AI-powered OCR.",
      color: "red",
      status: "In Development",
    },
    {
      icon: Bell,
      title: "Budget Alerts",
      description:
        "Get notified when you're approaching or exceeding category limits to stay on track.",
      color: "yellow",
      status: "Planned",
    },
    {
      icon: FileText,
      title: "Reports & Analytics",
      description:
        "Generate detailed spending reports and visualize trends across categories and time periods.",
      color: "indigo",
      status: "Planned",
    },
  ];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            Features
          </Title>
          <Text c="dimmed" size="lg">
            Discover what Savey McSaveface can do for your budgeting needs
          </Text>
        </div>

        <div>
          <Group gap="xs" mb="md">
            <ThemeIcon size="lg" variant="light" color="blue">
              <Sparkles size={20} />
            </ThemeIcon>
            <Title order={2}>Current Features</Title>
          </Group>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="md">
            {currentFeatures.map((feature) => (
              <Paper key={feature.title} withBorder p="lg" radius="md">
                <Group gap="md" align="flex-start">
                  <ThemeIcon
                    size={44}
                    radius="md"
                    variant="light"
                    color={feature.color}
                  >
                    <feature.icon size={24} />
                  </ThemeIcon>
                  <div style={{ flex: 1 }}>
                    <Text fw={600} size="lg" mb={4}>
                      {feature.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {feature.description}
                    </Text>
                  </div>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </div>

        <Divider />

        <div>
          <Group gap="xs" mb="md">
            <ThemeIcon size="lg" variant="light" color="orange">
              <Clock size={20} />
            </ThemeIcon>
            <Title order={2}>Coming Soon</Title>
          </Group>
          <Text c="dimmed" mb="md">
            Exciting features we&apos;re working on to make your budgeting even
            better
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {upcomingFeatures.map((feature) => (
              <Paper
                key={feature.title}
                withBorder
                p="lg"
                radius="md"
                style={{ opacity: 0.85 }}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <ThemeIcon
                      size={44}
                      radius="md"
                      variant="light"
                      color={feature.color}
                    >
                      <feature.icon size={24} />
                    </ThemeIcon>
                    <Badge variant="outline" color={feature.color} size="sm">
                      {feature.status}
                    </Badge>
                  </Group>
                  <div>
                    <Text fw={600} size="lg" mb={4}>
                      {feature.title}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {feature.description}
                    </Text>
                  </div>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </div>
      </Stack>
    </Container>
  );
}
