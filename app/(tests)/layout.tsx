// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

/**
 * Layout for tests.peter.sh—these test cases should be very focused to the core functionality, and
 * don't have to include the references and metadata used for the rest of the site.
 */
export default function TestsLayout(props: React.PropsWithChildren) {
    return (
        <div>
            <h1>tests.peter.sh</h1>
            {props.children}
        </div>
    );
}
