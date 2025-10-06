import React from 'react';
import { Link } from 'react-router-dom';

interface NavLink {
    to: string;
    text: string;
    href?: true;
}

interface ActionButton {
    text: string;
    onClick: () => void; // Function to execute on click (e.g., logout)
}

interface AdminAppLayoutProps {
    /** The main title for the page (e.g., "Submissions," "Form Builder") */
    pageTitle: string;

    /** The content of the current page (e.g., <AdminSubmissionList />) */
    children: React.ReactNode;

    /** Optional secondary title/description below the main title */
    pageSubtitle?: string;

    /** The first link object for left-aligned navigation */
    navLink1?: NavLink;

    /** The second link object for left-aligned navigation */
    navLink2?: NavLink;

    /** 🌟 NEW: Action button for the far right (e.g., Log Out) */
    actionButton?: ActionButton;
}

// -----------------------------------------------------------
// Helper Component for Navigation Links (Left Side)
// -----------------------------------------------------------
const NavLinkWithHover: React.FC<NavLink> = ({ to, text, href }) => { // 🌟 DESTRUCTURED href
    const [isHovered, setIsHovered] = React.useState(false);

    const linkStyle: React.CSSProperties = {
        color: isHovered ? 'white' : '#d1d5db',
        fontSize: '0.875rem',
        fontWeight: '500',
        textDecoration: 'none',
        transition: 'color 0.2s',
    };

    const baseProps = {
        style: linkStyle,
        onMouseOver: () => setIsHovered(true),
        onMouseOut: () => setIsHovered(false),
    };

    if (href) { // 🌟 RENDER <a> TAG IF href: true IS PRESENT
        return (
            <a
                href={to} // Use 'to' as the standard href attribute
                {...baseProps}
            >
                {text}
            </a>
        );
    }

    // Default: RENDER React Router <Link>
    return (
        <Link
            to={to}
            {...baseProps}
        >
            {text}
        </Link>
    );
};

// -----------------------------------------------------------
// Helper Component for Action Button (Right Side)
// -----------------------------------------------------------
const ActionButtonWithHover: React.FC<ActionButton> = ({ text, onClick }) => {
    const [isHovered, setIsHovered] = React.useState(false);

    const buttonStyle: React.CSSProperties = {
        // Looks like a link, but is a button
        backgroundColor: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',

        // Text styling from links
        color: isHovered ? 'white' : '#d1d5db',
        fontSize: '0.875rem',
        fontWeight: '500',
        transition: 'color 0.2s',
    };

    return (
        <button
            onClick={onClick}
            style={buttonStyle}
            onMouseOver={() => setIsHovered(true)}
            onMouseOut={() => setIsHovered(false)}
        >
            {text}
        </button>
    );
};
// -----------------------------------------------------------


// Standard CSS for the gradient background
const heroBackgroundStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #1f2937 0%, #064e3b 100%)',
};

const AdminAppLayout: React.FC<AdminAppLayoutProps> = ({
                                                           pageTitle,
                                                           children,
                                                           pageSubtitle,
                                                           navLink1,
                                                           navLink2,
                                                           actionButton
                                                       }) => {

    const maxContentWidth = '1280px';

    // Check if any link or button exists to decide if we need the nav bar
    const hasAnyNavElement = navLink1 || navLink2 || actionButton;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f7f7f7' }}>

            {/* === Header/Hero Section - FULL WIDTH === */}
            <header
                style={{ ...heroBackgroundStyle, width: '100%', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
            >
                <div style={{
                    maxWidth: maxContentWidth,
                    margin: '0 auto',
                    padding: '40px 16px'
                }}>

                    {/* Title and Subtitle remain here */}
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'white', marginBottom: '0.5rem' }}>
                        {pageTitle}
                    </h1>
                    {pageSubtitle && (
                        <p style={{ fontSize: '1.25rem', color: '#a7f3d0', fontWeight: '300', marginBottom: '1rem' }}>
                            {pageSubtitle}
                        </p>
                    )}

                    {/* Navigation Links and Action Button Container */}
                    {hasAnyNavElement && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>


                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                {navLink1 && (
                                    <NavLinkWithHover to={navLink1.to} text={navLink1.text} href={navLink1.href} />
                                )}

                                {/* Separator only if both 1 and 2 exist */}
                                {(navLink1 && navLink2) && <span style={{ color: '#6b7280' }}>|</span>}

                                {navLink2 && (
                                    <NavLinkWithHover to={navLink2.to} text={navLink2.text} href={navLink2.href} />
                                )}
                            </div>


                            <div>
                                {actionButton && (
                                    <ActionButtonWithHover
                                        onClick={actionButton.onClick}
                                        text={actionButton.text}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </header>


            <main style={{ maxWidth: maxContentWidth, margin: '0 auto', padding: '32px 16px' }}>
                {children}
            </main>

            <footer style={{ padding: '20px', textAlign: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
                &copy; 2024 Actserv Assessment Submission.
            </footer>
        </div>
    );
};

export default AdminAppLayout;