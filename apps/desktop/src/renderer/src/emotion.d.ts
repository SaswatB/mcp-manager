import "@emotion/react";
import { SerializedStyles } from "@emotion/react";

declare module "@emotion/react" {
  export interface Theme {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      text: string;
      error: string;
      success: string;
      warning: string;
    };
    fontSizes: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    space: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
  }
}

declare module "react" {
  interface Attributes {
    css?: SerializedStyles | SerializedStyles[];
  }
}
