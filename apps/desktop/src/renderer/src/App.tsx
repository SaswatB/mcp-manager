import { useState, useEffect, useRef } from "react";
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

// Add a modal component for adding servers manually
const AddServerModal = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: ${(props) => (props.isOpen ? "flex" : "none")};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #1a1625;
  border-radius: 8px;
  padding: 1.5rem;
  width: 450px;
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
  border: 1px solid #2d2640;
`;

const ModalTitle = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #a78bfa;
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #2d2640;
  background-color: #211c2f;
  color: #e2e8f0;
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: #a78bfa;
    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.25);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.5rem;
`;

// Simplify the Connections page content
const ConnectionsContent = () => {
  const [connectionUrl, setConnectionUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConnectionUrl = async () => {
      try {
        setIsLoading(true);
        const url = await window.api.getMCPConnectionURL();
        setConnectionUrl(url);
      } catch (error) {
        console.error("Error loading MCP connection URL:", error);
        setConnectionUrl("Error loading connection URL");
      } finally {
        setIsLoading(false);
      }
    };

    loadConnectionUrl();
  }, []);

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

        <ConnectionCodeBlock>
          {isLoading ? "Loading..." : connectionUrl}
        </ConnectionCodeBlock>

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
      id?: number;
      name: string;
      ip: string;
      status?: string;
      error?: string;
      description?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config?: any;
    }[]
  >([]);
  const [activeTab, setActiveTab] = useState<"saved" | "discover">("saved");
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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

  // Add state for the modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newServer, setNewServer] = useState({
    name: "",
    url: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load servers on component mount
  useEffect(() => {
    const fetchServers = async () => {
      try {
        setIsLoading(true);
        const serverData = await window.api.getServers();
        console.log("serverData", serverData);
        setServers(serverData);
      } catch (error) {
        console.error("Error fetching servers:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchServers();

    // Set up event listeners for server status changes
    window.api.onServerStatusChange((_, serverInfo) => {
      setServers((prevServers) => {
        const updatedServers = [...prevServers];
        const index = updatedServers.findIndex(
          (s) => s.name === serverInfo.name
        );

        if (index !== -1) {
          updatedServers[index] = {
            ...updatedServers[index]!,
            status: serverInfo.status,
            error: serverInfo.error,
          };
        } else {
          updatedServers.push(serverInfo);
        }

        return updatedServers;
      });
    });

    window.api.onServerError((_, serverInfo) => {
      setServers((prevServers) => {
        const updatedServers = [...prevServers];
        const index = updatedServers.findIndex(
          (s) => s.name === serverInfo.name
        );

        if (index !== -1) {
          updatedServers[index] = {
            ...updatedServers[index]!,
            status: serverInfo.status,
            error: serverInfo.error,
          };
        }

        return updatedServers;
      });
    });

    // Clean up event listeners on unmount
    return () => {
      window.api.removeAllListeners();
    };
  }, []);

  const addServer = async (server: {
    id: number;
    name: string;
    ip: string;
    description: string;
  }) => {
    try {
      // Create a server config from the discovered server
      const serverConfig = {
        name: server.name,
        url: `http://${server.ip}:8371/mcp`,
        keywords: ["mcp"],
      };

      const success = await window.api.addServer(serverConfig);

      if (success) {
        // The server will be added through the getServers call
        // which happens after the config change is detected
        setActiveTab("saved");
      }
    } catch (error) {
      console.error("Error adding server:", error);
    }
  };

  const connectToServer = async (serverName: string) => {
    try {
      await window.api.connectServer(serverName);
    } catch (error) {
      console.error(`Error connecting to server ${serverName}:`, error);
    }
  };

  const disconnectServer = async (serverName: string) => {
    try {
      await window.api.disconnectServer(serverName);
    } catch (error) {
      console.error(`Error disconnecting from server ${serverName}:`, error);
    }
  };

  const removeServer = async (serverName: string) => {
    try {
      await window.api.removeServer(serverName);
    } catch (error) {
      console.error(`Error removing server ${serverName}:`, error);
    }
  };

  const handleAddServerManually = async () => {
    if (!newServer.name.trim() || !newServer.url.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Create server config object
      const serverConfig = {
        name: newServer.name.trim(),
        url: newServer.url.trim(),
        keywords: ["mcp"],
      };

      const success = await window.api.addServer(serverConfig);

      if (success) {
        // Close modal and reset form
        setNewServer({ name: "", url: "" });
        setIsAddModalOpen(false);
      }
    } catch (error) {
      console.error("Error adding server:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewServer((prev) => ({ ...prev, [name]: value }));
  };

  const filteredServers =
    searchTerm.trim() === ""
      ? servers
      : servers.filter(
          (server) =>
            server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            server.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (server.description &&
              server.description
                .toLowerCase()
                .includes(searchTerm.toLowerCase()))
        );

  return (
    <div className={styles.paddingNone}>
      <FlexRow alignItems="center" className={styles.marginBottomMd}>
        <SearchContainer>
          <Search size={14} />
          <SearchInput
            placeholder="Search by name, IP, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>
        <ButtonWithMargin onClick={() => setSearchTerm("")}>
          Clear
        </ButtonWithMargin>
        <ButtonWithMargin onClick={() => setIsAddModalOpen(true)}>
          Add Server
        </ButtonWithMargin>
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

      {isLoading ? (
        <EmptyStateContainer>
          <Label
            fontSize="0.875rem"
            fontWeight="500"
            className={styles.marginBottomXs}
          >
            Loading servers...
          </Label>
        </EmptyStateContainer>
      ) : activeTab === "saved" ? (
        filteredServers.length > 0 ? (
          <CardNoPadding>
            {filteredServers.map((server) => (
              <ServerItemDiv key={server.name}>
                <FlexRow alignItems="center">
                  <StatusDot isActive={server.status === "connected"} />
                  <ServerInfo>
                    <ServerName>{server.name}</ServerName>
                    <ServerMeta>
                      {server.ip} •{" "}
                      {server.status === "connected"
                        ? "Connected"
                        : server.status === "connecting"
                          ? "Connecting..."
                          : server.status === "closing"
                            ? "Disconnecting..."
                            : "Disconnected"}
                      {server.error && ` • Error: ${server.error}`}
                    </ServerMeta>
                  </ServerInfo>
                  <FlexRow className={styles.marginLeftAuto} gap="0.375rem">
                    {server.status === "connected" ? (
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => disconnectServer(server.name)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        size="1"
                        variant="soft"
                        onClick={() => connectToServer(server.name)}
                      >
                        Connect
                      </Button>
                    )}
                    <Button
                      size="1"
                      variant="outline"
                      onClick={() => removeServer(server.name)}
                    >
                      Remove
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
            <FlexRow gap="0.5rem" justifyContent="center">
              <Button onClick={() => setIsAddModalOpen(true)}>
                Add Server
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveTab("discover")}
              >
                Discover Servers
              </Button>
            </FlexRow>
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

      {/* Add Server Modal */}
      <AddServerModal isOpen={isAddModalOpen}>
        <ModalContent>
          <ModalTitle>Add MCP Server</ModalTitle>

          <FormGroup>
            <FormLabel>Server Name</FormLabel>
            <TextInput
              type="text"
              name="name"
              value={newServer.name}
              onChange={handleInputChange}
              placeholder="e.g. My MCP Server"
            />
          </FormGroup>

          <FormGroup>
            <FormLabel>Server URL</FormLabel>
            <TextInput
              type="text"
              name="url"
              value={newServer.url}
              onChange={handleInputChange}
              placeholder="e.g. http://localhost:8371/mcp"
            />
          </FormGroup>

          <ButtonGroup>
            <Button
              size="2"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setNewServer({ name: "", url: "" });
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="2"
              onClick={handleAddServerManually}
              disabled={
                isSubmitting || !newServer.name.trim() || !newServer.url.trim()
              }
            >
              {isSubmitting ? "Adding..." : "Add Server"}
            </Button>
          </ButtonGroup>
        </ModalContent>
      </AddServerModal>
    </div>
  );
};

// Update SettingsContent to be more compact
const SettingsContent = () => {
  const [settings, setSettings] = useState<{
    connectionTimeout: number;
    startOnBoot: boolean;
    logLevel: string;
    mcpPort: number;
  }>({
    connectionTimeout: 30,
    startOnBoot: false,
    logLevel: "info",
    mcpPort: 8371,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        // const settingsData = await window.api.getSettings();
        // setSettings(settingsData);
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleConnectionTimeoutChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = parseInt(e.target.value, 10);
    setSettings((prev) => ({ ...prev, connectionTimeout: value }));
    saveSettings({ connectionTimeout: value });
  };

  const handleStartOnBootChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setSettings((prev) => ({ ...prev, startOnBoot: value }));
    saveSettings({ startOnBoot: value });
  };

  const handleLogLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSettings((prev) => ({ ...prev, logLevel: value }));
    saveSettings({ logLevel: value });
  };

  const saveSettings = async (updatedSettings: Partial<typeof settings>) => {
    try {
      setIsSaving(true);
      await window.api.updateSettings(updatedSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.paddingNone}>
        <Card>
          <CardTitle>Loading settings...</CardTitle>
        </Card>
      </div>
    );
  }

  return (
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
          <SelectBox
            value={settings.connectionTimeout.toString()}
            onChange={handleConnectionTimeoutChange}
            disabled={isSaving}
          >
            <option value="15">15 seconds</option>
            <option value="30">30 seconds</option>
            <option value="60">60 seconds</option>
            <option value="120">120 seconds</option>
          </SelectBox>
        </div>

        <SeparatorWithMargin />

        <div className={styles.marginBottomSm}>
          <Label
            fontSize="0.8125rem"
            fontWeight="500"
            className={styles.marginBottomXs}
          >
            Log Level
          </Label>
          <SelectBox
            value={settings.logLevel}
            onChange={handleLogLevelChange}
            disabled={isSaving}
          >
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
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
            <Checkbox
              type="checkbox"
              checked={settings.startOnBoot}
              onChange={handleStartOnBootChange}
              disabled={isSaving}
            />
            <Label fontSize="0.8125rem">
              Launch MCP Manager when your computer starts
            </Label>
          </CheckboxLabel>
        </div>
      </Card>
    </div>
  );
};

// Update LogsContent for more efficient space usage
const LogsContent = () => {
  const [logs, setLogs] = useState<
    Array<{ timestamp: string; level: string; message: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Load logs on component mount
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const logData = await window.api.getLogs();
        setLogs(logData);
      } catch (error) {
        console.error("Error fetching logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();

    // Subscribe to new log entries
    window.api.onLogEntry((_, logEntry) => {
      setLogs((prevLogs) => [logEntry, ...prevLogs].slice(0, 1000));

      // Scroll to top when new logs arrive
      if (logsContainerRef.current) {
        logsContainerRef.current.scrollTop = 0;
      }
    });

    // Clean up event listener on unmount
    return () => {
      window.api.removeAllListeners();
    };
  }, []);

  const handleClearLogs = async () => {
    try {
      await window.api.clearLogs();
      setLogs([]);
    } catch (error) {
      console.error("Error clearing logs:", error);
    }
  };

  return (
    <div className={styles.paddingNone}>
      <FlexRow
        justifyContent="space-between"
        alignItems="center"
        className={styles.marginBottomSm}
      >
        <CardTitleNoMargin>System Logs</CardTitleNoMargin>
        <FlexRow gap="0.375rem">
          <Button size="1" variant="outline" onClick={handleClearLogs}>
            Clear Logs
          </Button>
          <Button size="1">Export</Button>
        </FlexRow>
      </FlexRow>

      <LogsContainer ref={logsContainerRef}>
        {isLoading ? (
          <LogEntry>Loading logs...</LogEntry>
        ) : logs.length > 0 ? (
          logs.map((log, index) => (
            <LogEntry key={index}>
              {`[${new Date(log.timestamp).toLocaleString()}] [${log.level}] ${log.message}`}
            </LogEntry>
          ))
        ) : (
          <LogEntry>No logs available</LogEntry>
        )}
      </LogsContainer>
    </div>
  );
};

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
