// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import { headers } from 'next/headers';

import TestsIndexPage from '../(tests)/TestsIndexPage';

/**
 * Root page of peter.sh, providing access to the most frequented tools, and maybe an overview of
 * the most recent articles if I decide to blog about stuff again one day.
 */
export default async function RootPage() {
    const requestOrigin =
        /* dev environment= */   process.env.APP_HOST_OVERRIDE ??
        /* production server= */ (await headers()).get('Host');

    if (requestOrigin?.includes('tests'))
        return <TestsIndexPage />;

    return (
        <>
            Hello, world.
            <button className="btn btn-xl">Default</button>
            <div className="card bg-base-200 card-border border-base-300 card-sm mt-4">
                <div className="card-body gap-4">
                    Hi
                </div>
            </div>
        </>
    );
}
