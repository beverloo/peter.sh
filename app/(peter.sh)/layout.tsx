// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import Link from 'next/link';

/**
 * Layout for peter.sh, i.e. the main website. Will match the general style of tests.peter.sh, but
 * will also include a few more references to other (popular) pages on the website.
 */
export default function Layout(props: React.PropsWithChildren) {
    const currentYear = (new Date()).getFullYear();
    return (
        <>
            <header className="mt-4">
                <div className="navbar bg-base-100 shadow-sm">
                    <div className="navbar-start pl-8">
                        <h1 className="text-xl">
                            Peter Beverloo
                        </h1>
                    </div>
                    <div className="navbar-center">
                        <ul className="menu menu-horizontal px-1">
                            <li>
                                <Link href="/" className="link">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="link">
                                    About
                                </Link>
                            </li>
                            <li>
                                <Link href="/examples" className="link">
                                    Experiments
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="link">
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="navbar-end mr-8">
                        <Link href="https://tests.peter.sh"
                              className="btn btn-outline btn-xs btn-primary rounded-full">
                            tests.peter.sh
                        </Link>
                    </div>
                </div>
                <div className="mx-8 my-4 divider"></div>
            </header>
            <main className="px-8">
                {props.children}
            </main>
            <footer className="mx-8 mb-4 divider">
                <div>
                    Copyright 2009–{currentYear},{' '}
                    <Link href="https://peter.sh" className="link">Peter Beverloo</Link>
                </div>
            </footer>
        </>
    );
}
