import { type ReactNode } from 'react';
import 'devextreme/dist/css/dx.fluent.blue.light.css';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps): ReactNode {
  return (
    <div className="main-layout">
      <header className="header">
        <div className="container">
          <h1>NanumAuth</h1>
        </div>
      </header>
      <main className="main-content">
        <div className="container">{children}</div>
      </main>
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 NanumAuth. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
