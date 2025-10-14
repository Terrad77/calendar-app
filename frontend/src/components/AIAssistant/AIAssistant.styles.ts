import { styled } from "@stitches/react";

export const AssistantContainer = styled("div", {
  position: "fixed",
  bottom: "20px",
  right: "20px",
  zIndex: 1000,
});

export const AssistantButton = styled("button", {
  width: "60px",
  height: "60px",
  borderRadius: "50%",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  border: "none",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.3s ease",

  "&:hover": {
    transform: "scale(1.1)",
    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.2)",
  },

  "&:active": {
    transform: "scale(0.95)",
  },

  "&:focus": {
    outline: "none",
  },
});

export const ChatWindow = styled("div", {
  position: "fixed",
  bottom: "90px",
  right: "20px",
  width: "400px",
  height: "600px",
  background: "white",
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  animation: "slideUp 0.3s ease-out",

  "@keyframes slideUp": {
    from: {
      opacity: 0,
      transform: "translateY(20px)",
    },
    to: {
      opacity: 1,
      transform: "translateY(0)",
    },
  },

  "@media (max-width: 768px)": {
    width: "calc(100vw - 40px)",
    height: "calc(100vh - 120px)",
    right: "20px",
    left: "20px",
    bottom: "90px",
  },
});

export const ChatHeader = styled("div", {
  padding: "20px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",

  h3: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600,
  },
});

export const CloseButton = styled("button", {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: "24px",
  cursor: "pointer",
  padding: "4px 8px",
  lineHeight: 1,

  "&:hover": {
    opacity: 0.8,
  },

  "&:focus": {
    outline: "none",
  },
});

export const MessagesContainer = styled("div", {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  backgroundColor: "#f9fafb",

  "&::-webkit-scrollbar": {
    width: "6px",
  },

  "&::-webkit-scrollbar-track": {
    background: "#f1f1f1",
  },

  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e0",
    borderRadius: "3px",
  },

  "&::-webkit-scrollbar-thumb:hover": {
    background: "#a0aec0",
  },
});

export const MessageWrapper = styled("div", {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const Message = styled("div", {
  maxWidth: "80%",
  padding: "12px 16px",
  borderRadius: "12px",
  wordWrap: "break-word",
  fontSize: "14px",
  lineHeight: "1.5",
  whiteSpace: "pre-wrap",

  variants: {
    role: {
      user: {
        alignSelf: "flex-end",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        color: "white",
        borderBottomRightRadius: "4px",
      },
      assistant: {
        alignSelf: "flex-start",
        background: "white",
        color: "#1f2937",
        border: "1px solid #e5e7eb",
        borderBottomLeftRadius: "4px",
      },
    },
  },
});

export const LoadingMessage = styled(Message, {
  "&::after": {
    content: "...",
    animation: "dots 1.5s steps(4, end) infinite",
  },

  "@keyframes dots": {
    "0%, 20%": {
      content: ".",
    },
    "40%": {
      content: "..",
    },
    "60%, 100%": {
      content: "...",
    },
  },
});

export const ActionButtons = styled("div", {
  display: "flex",
  gap: "8px",
  marginTop: "4px",
  marginLeft: "8px",
  flexWrap: "wrap",
});

export const ActionButton = styled("button", {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #667eea",
  background: "white",
  color: "#667eea",
  fontSize: "12px",
  cursor: "pointer",
  transition: "all 0.2s",
  fontWeight: 500,

  "&:hover": {
    background: "#667eea",
    color: "white",
    transform: "translateY(-1px)",
    boxShadow: "0 2px 4px rgba(102, 126, 234, 0.2)",
  },

  "&:active": {
    transform: "translateY(0)",
  },

  "&:focus": {
    outline: "none",
  },
});

export const InputContainer = styled("div", {
  padding: "16px",
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  gap: "8px",
  backgroundColor: "white",
});

export const Input = styled("input", {
  flex: 1,
  padding: "12px 16px",
  borderRadius: "24px",
  border: "1px solid #e5e7eb",
  fontSize: "14px",
  outline: "none",
  transition: "border-color 0.2s",

  "&:focus": {
    borderColor: "#667eea",
  },

  "&:disabled": {
    backgroundColor: "#f9fafb",
    cursor: "not-allowed",
  },

  "&::placeholder": {
    color: "#9ca3af",
  },
});

export const SendButton = styled("button", {
  padding: "12px 20px",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  border: "none",
  color: "white",
  fontSize: "14px",
  cursor: "pointer",
  fontWeight: 600,
  transition: "all 0.2s",

  "&:hover": {
    transform: "translateY(-1px)",
    boxShadow: "0 4px 8px rgba(102, 126, 234, 0.3)",
  },

  "&:active": {
    transform: "translateY(0)",
  },

  "&:disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
    transform: "none",
  },

  "&:focus": {
    outline: "none",
  },
});

export const QuickActions = styled("div", {
  padding: "12px 20px",
  borderBottom: "1px solid #e5e7eb",
  display: "flex",
  gap: "8px",
  overflowX: "auto",
  backgroundColor: "white",

  "&::-webkit-scrollbar": {
    height: "4px",
  },

  "&::-webkit-scrollbar-thumb": {
    background: "#cbd5e0",
    borderRadius: "2px",
  },
});

export const QuickActionChip = styled("button", {
  padding: "6px 12px",
  borderRadius: "16px",
  border: "1px solid #e5e7eb",
  background: "white",
  fontSize: "12px",
  whiteSpace: "nowrap",
  cursor: "pointer",
  transition: "all 0.2s",
  fontWeight: 500,

  "&:hover": {
    background: "#f3f4f6",
    borderColor: "#667eea",
    color: "#667eea",
  },

  "&:focus": {
    outline: "none",
  },
});

export const ErrorMessage = styled("div", {
  padding: "12px",
  borderRadius: "8px",
  background: "#fee",
  color: "#c33",
  fontSize: "13px",
  marginTop: "8px",
  border: "1px solid #fcc",
});
