declare module "*.jsx" {
  import React from "react";
  const Component: React.ComponentType<unknown>;
  export default Component;
}

declare module "*.js" {
  import React from "react";
  const Component: React.ComponentType<unknown>;
  export default Component;
}

// Declarations for specific modules without types
declare module "./pages/SignUpPage/SignUpPage" {
  import React from "react";
  const Component: React.ComponentType<unknown>;
  export default Component;
}

declare module "./pages/SignInPage/SignInPage" {
  import React from "react";
  const Component: React.ComponentType<unknown>;
  export default Component;
}

declare module "./pages/HomePage/HomePage" {
  import React from "react";
  const Component: React.ComponentType<unknown>;
  export default Component;
}
