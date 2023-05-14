/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./style.css";

import { Settings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { Alerts, Button } from "@webpack/common";
import { User } from "discord-types/general";

import ReviewsView from "./components/ReviewsView";
import { UserType } from "./entities/User";
import { getCurrentUserInfo } from "./Utils/ReviewDBAPI";
import { authorize, showToast } from "./Utils/Utils";

export default definePlugin({
    name: "ReviewDB",
    description: "Review other users (Adds a new settings to profiles)",
    authors: [Devs.mantikafasi, Devs.Ven],

    patches: [
        {
            find: "disableBorderColor:!0",
            replacement: {
                match: /\(.{0,10}\{user:(.),setNote:.,canDM:.,.+?\}\)/,
                replace: "$&,$self.getReviewsComponent($1)"
            }
        }
    ],

    options: {
        authorize: {
            type: OptionType.COMPONENT,
            description: "Authorize with ReviewDB",
            component: () => (
                <Button onClick={authorize}>
                    Authorize with ReviewDB
                </Button>
            )
        },
        notifyReviews: {
            type: OptionType.BOOLEAN,
            description: "Notify about new reviews on startup",
            default: true,
        },
        showWarning: {
            type: OptionType.BOOLEAN,
            description: "Display warning to be respectful at the top of the reviews list",
            default: true,
        },
        hideTimestamps: {
            type: OptionType.BOOLEAN,
            description: "Hide timestamps on reviews",
            default: false,
        },
        website: {
            type: OptionType.COMPONENT,
            description: "ReviewDB website",
            component: () => (
                <Button onClick={() => {
                    window.open("https://reviewdb.mantikafasi.dev");
                }}>
                    ReviewDB website
                </Button>
            )
        },
        supportServer: {
            type: OptionType.COMPONENT,
            description: "ReviewDB Support Server",
            component: () => (
                <Button onClick={() => {
                    window.open("https://discord.gg/eWPBSbvznt");
                }}>
                    ReviewDB Support Server
                </Button>
            )
        },
    },

    async start() {
        const settings = Settings.plugins.ReviewDB;
        if (!settings.notifyReviews || !settings.token) return;

        setTimeout(async () => {
            const user = await getCurrentUserInfo(settings.token);
            if (settings.lastReviewId < user.lastReviewID) {
                settings.lastReviewId = user.lastReviewID;
                if (user.lastReviewID !== 0)
                    showToast("You have new reviews on your profile!");
            }

            if (user.banInfo) {
                const endDate = new Date(user.banInfo.banEndDate);
                if (endDate > new Date() && (settings.user?.banInfo?.banEndDate ?? 0) < endDate) {

                    Alerts.show({
                        title: "You have been banned from ReviewDB",
                        body: <>
                            <p>
                                You are banned from ReviewDB {(user.type === UserType.Banned) ? "permanently" : "until " + endDate.toLocaleString()}
                            </p>
                            <p>
                                Offending Review: {user.banInfo.reviewContent}
                            </p>
                            <p>
                                Continued offenses will result in a permanent ban.
                            </p>
                        </>,
                        cancelText: "Appeal",
                        confirmText: "Ok",
                        onCancel: () => {
                            window.open("https://forms.gle/Thj3rDYaMdKoMMuq6");
                        }
                    });
                }
            }

            settings.user = user;
        }, 4000);
    },

    getReviewsComponent: (user: User) => (
        <ErrorBoundary message="Failed to render Reviews">
            <ReviewsView userId={user.id} />
        </ErrorBoundary>
    )
});
