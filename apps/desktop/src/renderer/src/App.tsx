import { useState } from "react";
import { Button, Theme, Separator } from "@radix-ui/themes";
import "normalize.css";
import "@radix-ui/themes/styles.css";
import styled from "@emotion/styled";
import { DesktopIcon } from "@radix-ui/react-icons";
import {
  Server,
  Settings,
  List,
  Search,
  Link as LinkIcon,
  Code,
  Bot,
} from "lucide-react";
import { Global, css } from "@emotion/react";
import { version } from "../../../package.json";

const globalStyles = css`
  body {
    background-color: #13111c;
    color: #e2e8f0;
    font-family:
      -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu,
      Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #1a1625;
  }

  ::-webkit-scrollbar-thumb {
    background: #3d3654;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #4c4368;
  }
`;

// CSS classes for common styling patterns
const styles = {
  marginBottomXs: "margin-bottom-xs",
  marginBottomSm: "margin-bottom-sm",
  marginBottomMd: "margin-bottom-md",
  marginBottomLg: "margin-bottom-lg",
  marginLeftXs: "margin-left-xs",
  marginLeftSm: "margin-left-sm",
  marginLeftMd: "margin-left-md",
  marginLeftAuto: "margin-left-auto",
  marginTopXs: "margin-top-xs",
  marginTopSm: "margin-top-sm",
  paddingNone: "padding-none",
};

// Additional global styles including utility classes
const additionalGlobalStyles = css`
  .${styles.marginBottomXs} {
    margin-bottom: 0.25rem;
  }
  .${styles.marginBottomSm} {
    margin-bottom: 0.5rem;
  }
  .${styles.marginBottomMd} {
    margin-bottom: 1rem;
  }
  .${styles.marginBottomLg} {
    margin-bottom: 1.5rem;
  }
  .${styles.marginLeftXs} {
    margin-left: 0.25rem;
  }
  .${styles.marginLeftSm} {
    margin-left: 0.5rem;
  }
  .${styles.marginLeftMd} {
    margin-left: 0.75rem;
  }
  .${styles.marginLeftAuto} {
    margin-left: auto;
  }
  .${styles.marginTopXs} {
    margin-top: 0.25rem;
  }
  .${styles.marginTopSm} {
    margin-top: 0.5rem;
  }
  .${styles.paddingNone} {
    padding: 0 !important;
  }
`;

// Styled components using Emotion
const PageContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const PageContentBox = styled.div`
  padding: 1rem;
  flex: 1;
  overflow-y: auto;
`;

// More subtle card design
const Card = styled.div`
  background-color: rgba(26, 22, 37, 0.6);
  border-radius: 6px;
  border: 1px solid #2d2640;
  padding: 0.75rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);

  &:hover {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
  }
`;

const CardNoPadding = styled.div`
  background-color: rgba(26, 22, 37, 0.6);
  border-radius: 6px;
  border: 1px solid #2d2640;
  padding: 0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);

  &:hover {
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.25);
  }
`;

const CardTitle = styled.div`
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #a78bfa;
`;

const CardTitleNoMargin = styled(CardTitle)`
  margin: 0;
`;

const FlexRow = styled.div<{
  justifyContent?: string;
  alignItems?: string;
  gap?: string;
}>`
  display: flex;
  justify-content: ${(props) => props.justifyContent || "flex-start"};
  align-items: ${(props) => props.alignItems || "stretch"};
  gap: ${(props) => props.gap || "0"};
`;

const SearchContainer = styled.div`
  flex: 1;
  border: 1px solid #2d2640;
  border-radius: 6px;
  padding: 0.375rem 0.625rem;
  display: flex;
  align-items: center;
  background-color: #211c2f;
  transition: border-color 0.2s ease;

  &:focus-within {
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.25);
  }
`;

const SearchInput = styled.input`
  margin-left: 0.5rem;
  border: none;
  outline: none;
  width: 100%;
  background-color: transparent;
  color: #e2e8f0;

  &::placeholder {
    color: #64748b;
  }
`;

const Label = styled.div<{
  color?: string;
  fontWeight?: string;
  fontSize?: string;
}>`
  color: ${(props) => props.color || "#E2E8F0"};
  font-weight: ${(props) => props.fontWeight || "normal"};
  font-size: ${(props) => props.fontSize || "inherit"};
`;

const ServerItem = styled.div`
  padding: 0.5rem 0.75rem;
  border: 1px solid #2d2640;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #211c2f;
  }
`;

const ServerDescription = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  margin-top: 0.25rem;
`;

const StatusDot = styled.div<{ isActive?: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${(props) => (props.isActive ? "#A78BFA" : "#475569")};
  margin-right: 0.75rem;
  box-shadow: 0 0 8px
    ${(props) => (props.isActive ? "rgba(167, 139, 250, 0.6)" : "transparent")};
`;

const ServerInfo = styled.div``;

const ServerName = styled.div`
  font-weight: 600;
`;

const ServerMeta = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
`;

const LogsContainer = styled.div`
  background-color: #0f0d17;
  color: #e2e8f0;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  padding: 0.75rem;
  border-radius: 6px;
  height: 380px;
  overflow-y: auto;
  font-size: 0.75rem;
  border: 1px solid #2d2640;
`;

const LogEntry = styled.div`
  margin-bottom: 0.25rem;
  line-height: 1.3;

  &:nth-of-type(even) {
    color: #a78bfa;
  }
`;

const SidebarContainer = styled.div`
  width: 220px;
  height: 100%;
  border-right: 1px solid #2d2640;
  background-color: #13111c;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 0.75rem;
`;

const SidebarNavigation = styled.div`
  padding-top: 0.75rem;
  padding-bottom: 0.75rem;
  flex: 1;
`;

const SidebarFooter = styled.div`
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  color: #64748b;
`;

const SidebarButton = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  margin: 0 0.35rem 0.2rem 0.35rem;
  border-radius: 6px;
  background-color: ${(props) => (props.active ? "#583C93" : "transparent")};
  color: ${(props) => (props.active ? "white" : "#E2E8F0")};
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${(props) => (props.active ? "#6E4ABA" : "#1A1625")};
    transform: translateX(3px);
  }
`;

const IconWrapper = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => (props.active ? "white" : "#94A3B8")};
`;

const NavLabel = styled.div<{ active?: boolean }>`
  margin-left: 0.75rem;
  font-weight: ${(props) => (props.active ? "500" : "normal")};
`;

const MainContent = styled.div`
  flex: 1;
  height: 100%;
  background-color: #13111c;
  overflow-y: auto;
`;

const HeaderContainer = styled.div`
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #2d2640;
  background-color: #1a1625;
`;

const HeaderTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #a78bfa;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const HeaderDescription = styled.div`
  font-size: 0.8rem;
  color: #94a3b8;
`;

const AppLayout = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  background-color: #13111c;
`;

const SeparatorWithMargin = styled(Separator)`
  margin: 12px 0;
`;

const DarkSeparator = styled(Separator)`
  margin: 0;
  background-color: #2d2640;
`;

const PurpleIcon = styled(DesktopIcon)`
  color: #a78bfa;
`;

const ButtonWithMargin = styled(Button)`
  margin-left: 8px;
`;

const ServerItemDiv = styled.div`
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid #2d2640;

  &:last-child {
    border-bottom: none;
  }
`;

const SelectBox = styled.select`
  border: 1px solid #2d2640;
  border-radius: 6px;
  padding: 4px 8px;
  width: 200px;
  background-color: #211c2f;
  color: #e2e8f0;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
`;

const Checkbox = styled.input`
  margin-right: 0.5rem;
`;

const PurpleAppTitle = styled(Label)`
  font-weight: 700;
  font-size: 1.125rem;
  color: #a78bfa;
`;

// Update tabs to be more compact
const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #2d2640;
  margin-bottom: 0.75rem;
`;

const Tab = styled.div<{ active?: boolean }>`
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: ${(props) => (props.active ? "600" : "normal")};
  color: ${(props) => (props.active ? "#a78bfa" : "#94a3b8")};
  border-bottom: 2px solid
    ${(props) => (props.active ? "#a78bfa" : "transparent")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${(props) => (props.active ? "#a78bfa" : "#e2e8f0")};
  }
`;

const EmptyStateContainer = styled.div`
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #94a3b8;
`;

const EmptyStateIcon = styled.div`
  margin-bottom: 0.75rem;
  color: #3d3654;
`;

// More compact App Install components
const AppInstallContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
`;

const AppInstallCard = styled.div`
  background-color: #1a1625;
  border: 1px solid #2d2640;
  border-radius: 6px;
  padding: 0.75rem 0.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
    border-color: #a78bfa;
    background-color: rgba(30, 25, 45, 0.7);
  }

  &:after {
    content: "";
    position: absolute;
    right: 8px;
    top: 8px;
    width: 10px;
    height: 10px;
    opacity: 0.5;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23a78bfa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'%3E%3C/path%3E%3Cpolyline points='15 3 21 3 21 9'%3E%3C/polyline%3E%3Cline x1='10' y1='14' x2='21' y2='3'%3E%3C/line%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
    transition: opacity 0.2s ease;
  }

  &:hover:after {
    opacity: 1;
  }
`;

const AppIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  color: #a78bfa;
`;

const AppName = styled.div`
  font-weight: 600;
  font-size: 0.8125rem;
  color: #e2e8f0;
`;

const ConnectionCodeBlock = styled.div`
  background-color: #0f0d17;
  border-radius: 6px;
  padding: 0.625rem 0.75rem;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 0.75rem;
  color: #a78bfa;
  margin: 0.75rem 0;
  border: 1px solid #2d2640;
`;

// Simplify the Connections page content
const ConnectionsContent = () => {
  return (
    <div className={styles.paddingNone}>
      <Card>
        <CardTitle>Connect to MCP Manager</CardTitle>

        <Label
          fontSize="0.8125rem"
          color="#94a3b8"
          className={styles.marginBottomSm}
        >
          MCP Manager is available at the following URL:
        </Label>

        <ConnectionCodeBlock>http://localhost:3000/api/mcp</ConnectionCodeBlock>

        <SeparatorWithMargin />

        <Label
          fontSize="0.8125rem"
          fontWeight="500"
          className={styles.marginBottomXs}
        >
          Quick Install
        </Label>

        <AppInstallContainer>
          <AppInstallCard>
            <AppIcon>
              <Bot size={24} />
            </AppIcon>
            <AppName>Claude Desktop</AppName>
          </AppInstallCard>

          <AppInstallCard>
            <AppIcon>
              <Code size={24} />
            </AppIcon>
            <AppName>Cursor</AppName>
          </AppInstallCard>

          <AppInstallCard>
            <AppIcon>
              <LinkIcon size={24} />
            </AppIcon>
            <AppName>Windsurf</AppName>
          </AppInstallCard>
        </AppInstallContainer>
      </Card>
    </div>
  );
};

// Update ServersContent for more efficient space usage
const ServersContent = () => {
  const [servers, setServers] = useState<
    {
      id: number;
      name: string;
      ip: string;
      status?: boolean;
      description?: string;
    }[]
  >([
    {
      id: 1,
      name: "Production Server 1",
      ip: "10.1.1.1",
      status: true,
      description: "Main production MCP server",
    },
    {
      id: 2,
      name: "Production Server 2",
      ip: "10.1.1.2",
      status: false,
      description: "Backup production MCP server",
    },
  ]);
  const [activeTab, setActiveTab] = useState<"saved" | "discover">(
    servers.length > 0 ? "saved" : "discover"
  );

  const [discoveredServers] = useState<
    { id: number; name: string; ip: string; description: string }[]
  >([
    {
      id: 1,
      name: "Demo Server 1",
      ip: "10.0.0.1",
      description:
        "Sample server description. This is a demo MCP server instance.",
    },
    {
      id: 2,
      name: "Demo Server 2",
      ip: "10.0.0.2",
      description:
        "Sample server description. This is a demo MCP server instance.",
    },
    {
      id: 3,
      name: "Demo Server 3",
      ip: "10.0.0.3",
      description:
        "Sample server description. This is a demo MCP server instance.",
    },
  ]);

  const addServer = (server: {
    id: number;
    name: string;
    ip: string;
    description: string;
  }) => {
    setServers([...servers, { ...server, status: false }]);
  };

  return (
    <div className={styles.paddingNone}>
      <FlexRow alignItems="center" className={styles.marginBottomMd}>
        <SearchContainer>
          <Search size={14} />
          <SearchInput placeholder="Search by name, IP, or description..." />
        </SearchContainer>
        <ButtonWithMargin>Search</ButtonWithMargin>
      </FlexRow>

      <TabsContainer>
        <Tab
          active={activeTab === "saved"}
          onClick={() => setActiveTab("saved")}
        >
          My Servers
        </Tab>
        <Tab
          active={activeTab === "discover"}
          onClick={() => setActiveTab("discover")}
        >
          Discover Servers
        </Tab>
      </TabsContainer>

      {activeTab === "saved" ? (
        servers.length > 0 ? (
          <CardNoPadding>
            {servers.map((server) => (
              <ServerItemDiv key={server.id}>
                <FlexRow alignItems="center">
                  <StatusDot isActive={server.status} />
                  <ServerInfo>
                    <ServerName>{server.name}</ServerName>
                    <ServerMeta>
                      {server.ip} •{" "}
                      {server.status ? "Connected" : "Disconnected"}
                    </ServerMeta>
                  </ServerInfo>
                  <FlexRow className={styles.marginLeftAuto} gap="0.375rem">
                    <Button size="1" variant="soft">
                      Connect
                    </Button>
                    <Button size="1" variant="outline">
                      Edit
                    </Button>
                  </FlexRow>
                </FlexRow>
              </ServerItemDiv>
            ))}
          </CardNoPadding>
        ) : (
          <EmptyStateContainer>
            <EmptyStateIcon>
              <Server size={36} />
            </EmptyStateIcon>
            <Label
              fontSize="0.875rem"
              fontWeight="500"
              className={styles.marginBottomXs}
            >
              No servers saved yet
            </Label>
            <Label
              fontSize="0.8125rem"
              color="#94a3b8"
              className={styles.marginBottomSm}
            >
              Add a server manually or discover servers on your network
            </Label>
            <Button>Add Your First Server</Button>
          </EmptyStateContainer>
        )
      ) : discoveredServers.length > 0 ? (
        <div>
          {discoveredServers.map((server) => (
            <ServerItem key={server.id}>
              <FlexRow alignItems="center">
                <Server size={14} />
                <Label fontWeight="500" className={styles.marginLeftSm}>
                  {server.name}
                </Label>
                <Label
                  color="#94a3b8"
                  fontSize="0.8125rem"
                  className={styles.marginLeftAuto}
                >
                  {server.ip}
                </Label>
              </FlexRow>
              <ServerDescription>{server.description}</ServerDescription>
              <FlexRow justifyContent="flex-end" className={styles.marginTopXs}>
                <Button size="1" onClick={() => addServer(server)}>
                  Add Server
                </Button>
              </FlexRow>
            </ServerItem>
          ))}
        </div>
      ) : (
        <EmptyStateContainer>
          <EmptyStateIcon>
            <Search size={36} />
          </EmptyStateIcon>
          <Label
            fontSize="0.875rem"
            fontWeight="500"
            className={styles.marginBottomXs}
          >
            No servers discovered
          </Label>
          <Label
            fontSize="0.8125rem"
            color="#94a3b8"
            className={styles.marginBottomSm}
          >
            Try searching for servers on your network
          </Label>
          <Button>Scan Network</Button>
        </EmptyStateContainer>
      )}
    </div>
  );
};

// Update SettingsContent to be more compact
const SettingsContent = () => (
  <div className={styles.paddingNone}>
    <Card>
      <CardTitle>General Settings</CardTitle>

      <SeparatorWithMargin />

      <div className={styles.marginBottomSm}>
        <Label
          fontSize="0.8125rem"
          fontWeight="500"
          className={styles.marginBottomXs}
        >
          Connection Timeout
        </Label>
        <SelectBox>
          <option value="30">30 seconds</option>
          <option value="60">60 seconds</option>
          <option value="120">120 seconds</option>
        </SelectBox>
      </div>

      <SeparatorWithMargin />

      <div>
        <Label
          fontSize="0.8125rem"
          fontWeight="500"
          className={styles.marginBottomXs}
        >
          Start on Boot
        </Label>
        <CheckboxLabel>
          <Checkbox type="checkbox" />
          <Label fontSize="0.8125rem">
            Launch MCP Manager when your computer starts
          </Label>
        </CheckboxLabel>
      </div>
    </Card>
  </div>
);

// Update LogsContent for more efficient space usage
const LogsContent = () => (
  <div className={styles.paddingNone}>
    <FlexRow
      justifyContent="space-between"
      alignItems="center"
      className={styles.marginBottomSm}
    >
      <CardTitleNoMargin>System Logs</CardTitleNoMargin>
      <FlexRow gap="0.375rem">
        <Button size="1" variant="outline">
          Clear Logs
        </Button>
        <Button size="1">Export</Button>
      </FlexRow>
    </FlexRow>

    <LogsContainer>
      {[...Array(15)].map((_, i) => (
        <LogEntry key={i}>
          {`[${new Date().toISOString()}] ${
            i % 3 === 0
              ? "INFO: Application started successfully"
              : i % 3 === 1
                ? "DEBUG: Connecting to server at 10.0.0.1..."
                : "WARN: Connection attempt timed out"
          }`}
        </LogEntry>
      ))}
    </LogsContainer>
  </div>
);

// Update Page Header Component to be more compact
const PageHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <HeaderContainer>
    <HeaderTitle>{title}</HeaderTitle>
    <HeaderDescription>{description}</HeaderDescription>
  </HeaderContainer>
);

// Generic Page component with better space usage
const Page = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <PageContainer>
    <PageHeader title={title} description={description} />
    <PageContentBox>{children}</PageContentBox>
  </PageContainer>
);

// Pages configuration
const PAGES = [
  {
    id: "servers",
    title: "MCP Servers",
    description: "Manage and discover MCP servers",
    icon: <Server size={18} />,
    content: <ServersContent />,
  },
  {
    id: "connections",
    title: "Connections",
    description: "Connect your applications to MCP Manager",
    icon: <LinkIcon size={18} />,
    content: <ConnectionsContent />,
  },
  {
    id: "settings",
    title: "Settings",
    description: "Configure your MCP Manager application",
    icon: <Settings size={18} />,
    content: <SettingsContent />,
  },
  {
    id: "logs",
    title: "Logs",
    description: "View application and connection logs",
    icon: <List size={18} />,
    content: <LogsContent />,
  },
] as const satisfies {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}[];
type PageId = (typeof PAGES)[number]["id"];

export function App() {
  const [currentPage, setCurrentPage] = useState<PageId>("servers");
  const pageConfig = PAGES.find((page) => page.id === currentPage) || PAGES[0];

  return (
    <Theme
      appearance="dark"
      accentColor="purple"
      grayColor="slate"
      radius="large"
      scaling="100%"
    >
      <Global styles={globalStyles} />
      <Global styles={additionalGlobalStyles} />
      <AppLayout>
        {/* Sidebar */}
        <SidebarContainer>
          <SidebarHeader>
            <FlexRow alignItems="center">
              <PurpleIcon width="24" height="24" />
              <PurpleAppTitle className={styles.marginLeftSm}>
                MCP Manager
              </PurpleAppTitle>
            </FlexRow>
          </SidebarHeader>
          <DarkSeparator />
          <SidebarNavigation>
            {PAGES.map((page) => (
              <SidebarButton
                key={page.id}
                active={currentPage === page.id}
                onClick={() => setCurrentPage(page.id)}
              >
                <IconWrapper active={currentPage === page.id}>
                  {page.icon}
                </IconWrapper>
                <NavLabel active={currentPage === page.id}>
                  {page.title}
                </NavLabel>
              </SidebarButton>
            ))}
          </SidebarNavigation>

          <SidebarFooter>
            <div>{`v${version}`}</div>
          </SidebarFooter>
        </SidebarContainer>

        {/* Main Content */}
        <MainContent>
          <Page title={pageConfig!.title} description={pageConfig!.description}>
            {pageConfig!.content}
          </Page>
        </MainContent>
      </AppLayout>
    </Theme>
  );
}
