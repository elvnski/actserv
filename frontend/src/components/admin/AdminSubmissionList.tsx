import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './admin.css';
import { useAdminAuth } from './context/AdminAuthContext.tsx';

// 🌟 New Imports for TanStack Table 🌟
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type PaginationState,
} from '@tanstack/react-table';


// --- INTERFACES ---
interface SubmissionSummary {
    id: number;
    form_name: string;
    submission_date: string; // ISO string format from Django
    client_identifier: string;
    is_notified: boolean;
}

// 🌟 Matches the response from Django's CustomPageNumberPagination 🌟
interface PaginatedResponse {
    pageIndex: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
    rows: SubmissionSummary[]; // The actual data records
}



// --- CONSTANTS ---
const ADMIN_SUBMISSIONS_API_URL = 'http://127.0.0.1:8000/api/admin/submissions/';

// --- HELPER FUNCTIONS ---
const formatDateTime = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch {
        return 'Invalid Date';
    }
};

// --- COMPONENT ---
const AdminSubmissionList = () => {

    // ------------------------------------------------
    // 1. STATE MANAGEMENT (Updated for Pagination)
    // ------------------------------------------------

    const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]); // 🌟 New State for Sorting 🌟

    const [globalFilter, setGlobalFilter] = useState('');

    // 🌟 Pagination 🌟
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0, // TanStack uses 0-based index
        pageSize: 12, // Must match the Django default/frontend choice
    });

    // 🌟 Metadata from API 🌟
    const [dataMeta, setDataMeta] = useState({
        totalRows: 0,
        totalPages: 0,
    });

    const { logout, isAuthReady } = useAdminAuth();
    const navigate = useNavigate();

    // ------------------------------------------------
    // 2. DATA FETCHING
    // ------------------------------------------------
    useEffect(() => {
        if (!isAuthReady) {
            return;
        }

        setIsLoading(true);

        // Calculate Django 1-based page number
        const page = pagination.pageIndex + 1;
        const pageSize = pagination.pageSize;

        // Build the query string with pagination and sorting
        let url = `${ADMIN_SUBMISSIONS_API_URL}?page=${page}&pageSize=${pageSize}`;

        if (globalFilter) {
            // Django's SearchFilter uses the query parameter 'search'
            url += `&search=${globalFilter}`;
        }

        // FUTURE STEP: Add server-side sorting here
        if (sorting.length > 0) {
            const sortKey = sorting[0].id;
            const sortDir = sorting[0].desc ? '-' : '';
            // Django REST Framework uses "ordering" query parameter
            url += `&ordering=${sortDir}${sortKey}`;
        }

        axios.get<PaginatedResponse>(url)
            .then(response => {
                const { rows, totalRows, totalPages } = response.data;

                // Set data rows
                setSubmissions(rows);

                // Set metadata for controls
                setDataMeta({ totalRows, totalPages });

                setError(null);
            })
            .catch(err => {
                console.error("Submission fetch error:", err);
                if (err.response && err.response.status === 401) {
                    logout();
                    navigate('/admin/login');
                } else {
                    setError('Failed to load submissions. Please check the API.');
                }
            })
            .finally(() => {
                setIsLoading(false);
            });

        // 🌟 DEPENDENCY ARRAY: Fetch new data when page or size changes 🌟
    }, [isAuthReady, logout, navigate, pagination.pageIndex, pagination.pageSize, sorting, globalFilter]);


    // ------------------------------------------------
    // 3. COLUMN DEFINITION (TanStack Table)
    // ------------------------------------------------
    const columns = useMemo<ColumnDef<SubmissionSummary>[]>(
        () => [
            {
                accessorKey: 'id',
                header: () => <span>ID</span>,
                cell: info => info.getValue(),
                footer: props => props.column.id,
            },
            {
                accessorKey: 'form_name',
                header: () => <span>Form Name</span>,
                cell: info => info.getValue(),
            },
            {
                accessorKey: 'submission_date',
                header: () => <span>Submission Date</span>,
                // Custom cell render function to use your formatDateTime helper
                cell: info => formatDateTime(info.getValue() as string),
            },
            {
                accessorKey: 'client_identifier',
                header: 'Client ID',
                cell: info => info.getValue() || 'N/A',
            },
            {
                accessorKey: 'is_notified',
                header: 'Notified',
                // Custom render for the status badge
                cell: info => (
                    <span className={`status-badge ${info.getValue() ? 'status-success' : 'status-pending'}`}>
                        {info.getValue() ? 'Yes' : 'No'}
                    </span>
                ),
            },
            // The action column is not tied to data, so we use a display column
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <Link to={`/admin/submissions/${row.original.id}`} className="btn-secondary btn-sm">
                        Details
                    </Link>
                ),
                enableSorting: false, // Actions column should not be sortable
            },
        ],
        []
    );


    // ------------------------------------------------
    // 4. TABLE INSTANCE (TanStack Table)
    // ------------------------------------------------
    const table = useReactTable({
        data: submissions,
        columns,
        state: {
            sorting,
            pagination,
            globalFilter,
        },
        // 🌟 TELLS TANSTACK: Do not do sorting/pagination locally 🌟
        manualSorting: true,
        manualPagination: true,

        // 🌟 Tells TanStack to allow external (manual) filtering 🌟
        manualFiltering: true,

        // Pass total row count from the API metadata
        pageCount: dataMeta.totalPages,

        onSortingChange: setSorting,
        onPaginationChange: setPagination,

        onGlobalFilterChange: (updater) => {
            // When filter changes, reset the page index to 0
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
            setGlobalFilter(updater);
        },

        getCoreRowModel: getCoreRowModel(),
    });


    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    // ------------------------------------------------
    // 5. COMPONENT RENDER
    // ------------------------------------------------

    return (
        <div className="admin-container">

            <nav className="admin-nav">
                <Link to="/admin/forms" className="btn-secondary btn-sm" style={{marginRight: '10px'}}>
                    Form Builder
                </Link>
                <button onClick={handleLogout} className="btn-danger btn-sm">
                    Logout
                </button>
            </nav>


            <h1>Form Submissions List</h1>


            {/* Loading/Error State */}
            {isLoading && <p>Loading submissions...</p>}
            {error && <p className="error-message">{error}</p>}


            {/* 🌟 Search Input Field 🌟 */}
            <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <input
                    type="text"
                    placeholder="Search by Client ID or Form Name..."
                    value={globalFilter ?? ''}
                    onChange={e => table.setGlobalFilter(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        borderRadius: '4px',
                        backgroundColor: 'white', // White background
                        border: '1px solid #343a40', // Border matching header color
                        color: '#343a40', // Text matching header color
                        width: '300px'
                    }}
                />
            </div>

            {/* Loading/Error State */}
            {isLoading && <p>Loading submissions...</p>}
            {error && <p className="error-message">{error}</p>}


            {/* Render Table when data is available */}
            {!isLoading && !error && (
                <>
                    <div className="table-responsive">
                        <table className="custom-table">
                            {/* ... (Existing Table Header and Body logic, unchanged) ... */}
                            <thead>
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th
                                            key={header.id}
                                            colSpan={header.colSpan}
                                            onClick={header.column.getToggleSortingHandler()}
                                            className={header.column.getCanSort() ? 'cursor-pointer' : ''}
                                        >
                                            {header.isPlaceholder ? null : (
                                                <>
                                                    {flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                                    {{
                                                        asc: ' 🔼',
                                                        desc: ' 🔽',
                                                    }[header.column.getIsSorted() as string] ?? null}
                                                </>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                            </thead>
                            <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} style={{ color: 'black' }}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 🌟 NEW: Pagination Controls 🌟 */}
                    <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                        {/* Status Message */}
                        <span>
                            Page {table.getState().pagination.pageIndex + 1} of {dataMeta.totalPages} (Total {dataMeta.totalRows} Submissions)
                        </span>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                className="btn-secondary"
                            >
                                Previous Page
                            </button>
                            <button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                className="btn-secondary"
                            >
                                Next Page
                            </button>
                        </div>
                    </div>
                </>
            )}

            {!isLoading && !error && submissions.length === 0 && (
                <p>No submissions found.</p>
            )}
        </div>
    );
};

export default AdminSubmissionList;