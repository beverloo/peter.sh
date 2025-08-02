// Copyright 2025 Peter Beverloo. All rights reserved.
// Use of this source code is governed by a MIT license that can be found in the LICENSE file.

import Link from 'next/link';

/**
 * Overview page for tests.peter.sh, which provides access to each of the individual test cases.
 */
export default function TestsIndexPage(props: React.PropsWithChildren) {
    return (
        <ul>
            <li><Link href="/notification-generator">Notification Generator</Link></li>
            <li><Link href="/push-message-generator">Push Message Generator</Link></li>
            <li><Link href="/push-encryption-verifier">Push Encryption Verifier</Link></li>
            <li><Link href="/contact-api">Contact API</Link></li>
        </ul>
    );
}
