const Profile = require("../models/profile");
const UserActivity = require("../models/user-activity");

async function createUserActivity(userId, actionType, targetType, targetId, description) {
    try {
        const userProfile = await Profile.findOne({ where: { userId: userId } });
        if (!userProfile) {
            throw new Error("Профиль пользователя не найден");
        }

        await UserActivity.create({
            profileId: userProfile.id,
            actionType: actionType,
            targetType: targetType,
            targetId: targetId,
            description: description,
        });
    } catch (error) {
        console.error("Ошибка записи активности: ", error)
        const err = new Error(error.message)
        err.httpStatusCode = 500
        return next(err)
    }

}
module.exports = { createUserActivity }