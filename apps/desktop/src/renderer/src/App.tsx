/** @jsxImportSource @emotion/react */
import { useState } from "react";
import { Button, Theme, Separator } from "@radix-ui/themes";
import "normalize.css";
import "@radix-ui/themes/styles.css";
import styled from "@emotion/styled";
import { DesktopIcon } from "@radix-ui/react-icons";
import { Server, Settings, List, Search } from "lucide-react";
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
  marginBottomSm: "margin-bottom-sm",
  marginBottomMd: "margin-bottom-md",
  marginBottomLg: "margin-bottom-lg",
  marginLeftSm: "margin-left-sm",
  marginLeftMd: "margin-left-md",
  marginLeftAuto: "margin-left-auto",
};

// Additional global styles including utility classes
const additionalGlobalStyles = css`
  .${styles.marginBottomSm} {
    margin-bottom: 0.5rem;
  }
  .${styles.marginBottomMd} {
    margin-bottom: 1rem;
  }
  .${styles.marginBottomLg} {
    margin-bottom: 1.5rem;
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
`;

// Styled components using Emotion
const PageContainer = styled.div``;

const PageContentBox = styled.div`
  padding: 1.5rem;
`;

const Card = styled.div`
  background-color: #1a1625;
  border-radius: 8px;
  border: 1px solid #2d2640;
  padding: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);

  &:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
  }
`;

const CardNoPadding = styled(Card)`
  padding: 0;
`;

const CardTitle = styled.div`
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
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
  padding: 0.5rem 0.75rem;
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
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
  padding: 0.75rem;
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
  padding: 1rem;
  border-radius: 6px;
  height: 400px;
  overflow-y: auto;
  font-size: 0.875rem;
  border: 1px solid #2d2640;
`;

const LogEntry = styled.div`
  margin-bottom: 0.25rem;

  &:nth-of-type(even) {
    color: #a78bfa;
  }
`;

const SidebarContainer = styled.div`
  width: 250px;
  height: 100%;
  border-right: 1px solid #2d2640;
  background-color: #13111c;
  display: flex;
  flex-direction: column;
`;

const SidebarHeader = styled.div`
  padding: 1rem;
  padding-top: 1.25rem;
  padding-bottom: 1.25rem;
`;

const SidebarNavigation = styled.div`
  padding-top: 1rem;
  padding-bottom: 1rem;
  flex: 1;
`;

const SidebarFooter = styled.div`
  padding: 1rem;
  font-size: 0.75rem;
  color: #64748b;
`;

const SidebarButton = styled.div<{ active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  margin: 0 0.5rem;
  margin-bottom: 0.25rem;
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
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #2d2640;
  background-color: #1a1625;
`;

const HeaderTitle = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #a78bfa;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
`;

const HeaderDescription = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
`;

const AppLayout = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  background-color: #13111c;
`;

const SeparatorWithMargin = styled(Separator)`
  margin: 16px 0;
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
  padding: 1rem;
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
  font-size: 1.25rem;
  color: #a78bfa;
`;

// Page components
const FindServersPage = () => (
  <PageContainer>
    <PageHeader
      title="Find New Servers"
      description="Discover and connect to MCP servers"
    />
    <PageContentBox>
      <Card>
        <CardTitle>Search Servers</CardTitle>

        <FlexRow alignItems="center" className={styles.marginBottomLg}>
          <SearchContainer>
            <Search size={16} />
            <SearchInput placeholder="Search by name, IP, or description..." />
          </SearchContainer>
          <ButtonWithMargin>Search</ButtonWithMargin>
        </FlexRow>

        <Label
          fontSize="0.875rem"
          fontWeight="500"
          color="#94a3b8"
          className={styles.marginBottomSm}
        >
          DISCOVERED SERVERS
        </Label>

        {/* Server List */}
        <div>
          {[1, 2, 3].map((i) => (
            <ServerItem key={i}>
              <FlexRow alignItems="center">
                <Server size={16} />
                <Label fontWeight="500" className={styles.marginLeftSm}>
                  Demo Server {i}
                </Label>
                <Label
                  color="#94a3b8"
                  fontSize="0.875rem"
                  className={styles.marginLeftAuto}
                >
                  10.0.0.{i}
                </Label>
              </FlexRow>
              <ServerDescription>
                Sample server description. This is a demo MCP server instance.
              </ServerDescription>
            </ServerItem>
          ))}
        </div>
      </Card>
    </PageContentBox>
  </PageContainer>
);

const SavedServersPage = () => (
  <PageContainer>
    <PageHeader
      title="Saved Servers"
      description="Manage your saved MCP server connections"
    />
    <PageContentBox>
      <FlexRow
        justifyContent="space-between"
        alignItems="center"
        className={styles.marginBottomMd}
      >
        <CardTitleNoMargin>Your Servers</CardTitleNoMargin>
        <Button>Add Server</Button>
      </FlexRow>

      <CardNoPadding>
        {[1, 2].map((i) => (
          <ServerItemDiv key={i}>
            <FlexRow alignItems="center">
              <StatusDot isActive={i === 1} />
              <ServerInfo>
                <ServerName>Production Server {i}</ServerName>
                <ServerMeta>10.1.1.{i} • Last connected: Today</ServerMeta>
              </ServerInfo>
              <FlexRow className={styles.marginLeftAuto} gap="0.5rem">
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
    </PageContentBox>
  </PageContainer>
);

const SettingsPage = () => (
  <PageContainer>
    <PageHeader
      title="Settings"
      description="Configure your MCP Manager application"
    />
    <PageContentBox>
      <Card>
        <CardTitle>General Settings</CardTitle>

        <SeparatorWithMargin />

        <div className={styles.marginBottomMd}>
          <Label
            fontSize="0.875rem"
            fontWeight="500"
            className={styles.marginBottomSm}
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
            fontSize="0.875rem"
            fontWeight="500"
            className={styles.marginBottomSm}
          >
            Start on Boot
          </Label>
          <CheckboxLabel>
            <Checkbox type="checkbox" />
            <Label fontSize="0.875rem">
              Launch MCP Manager when your computer starts
            </Label>
          </CheckboxLabel>
        </div>
      </Card>
    </PageContentBox>
  </PageContainer>
);

const LogsPage = () => (
  <PageContainer>
    <PageHeader
      title="Logs"
      description="View application and connection logs"
    />
    <PageContentBox>
      <FlexRow
        justifyContent="space-between"
        alignItems="center"
        className={styles.marginBottomMd}
      >
        <CardTitleNoMargin>System Logs</CardTitleNoMargin>
        <FlexRow gap="0.5rem">
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
    </PageContentBox>
  </PageContainer>
);

// Page Header Component
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

type Page = "find" | "saved" | "settings" | "logs";

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>("find");

  const renderPage = () => {
    switch (currentPage) {
      case "find":
        return <FindServersPage />;
      case "saved":
        return <SavedServersPage />;
      case "settings":
        return <SettingsPage />;
      case "logs":
        return <LogsPage />;
      default:
        return <FindServersPage />;
    }
  };

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
            <SidebarButton
              active={currentPage === "find"}
              onClick={() => setCurrentPage("find")}
            >
              <IconWrapper active={currentPage === "find"}>
                <Search size={18} />
              </IconWrapper>
              <NavLabel active={currentPage === "find"}>
                Find New Servers
              </NavLabel>
            </SidebarButton>
            <SidebarButton
              active={currentPage === "saved"}
              onClick={() => setCurrentPage("saved")}
            >
              <IconWrapper active={currentPage === "saved"}>
                <Server size={18} />
              </IconWrapper>
              <NavLabel active={currentPage === "saved"}>
                Saved Servers
              </NavLabel>
            </SidebarButton>
            <SidebarButton
              active={currentPage === "settings"}
              onClick={() => setCurrentPage("settings")}
            >
              <IconWrapper active={currentPage === "settings"}>
                <Settings size={18} />
              </IconWrapper>
              <NavLabel active={currentPage === "settings"}>Settings</NavLabel>
            </SidebarButton>
            <SidebarButton
              active={currentPage === "logs"}
              onClick={() => setCurrentPage("logs")}
            >
              <IconWrapper active={currentPage === "logs"}>
                <List size={18} />
              </IconWrapper>
              <NavLabel active={currentPage === "logs"}>Logs</NavLabel>
            </SidebarButton>
          </SidebarNavigation>

          <SidebarFooter>
            <div>{`v${version}`}</div>
          </SidebarFooter>
        </SidebarContainer>

        {/* Main Content */}
        <MainContent>{renderPage()}</MainContent>
      </AppLayout>
    </Theme>
  );
}
