const Profile = require("../models/profile")
const path = require('path')
const { sendTemplateEmail } = require("../send-email")
const Message = require("../models/message")
const { getAdminMessagesPagination } = require("../public/assets/js/pagination/admin-pagination")

exports.postSendEmail = async (req, res, next) => {
    try {
        let firstname = req.body.firstname
        let lastname = req.body.lastname
        const useremail = req.body.email
        const content = req.body.content
        let userProfile

        if (req.user) {
            userProfile = await Profile.findOne({ where: { userId: req.user.id } })
        }

        if (userProfile) {
            if (!firstname && userProfile.firstname) {
                firstname = userProfile.firstname
            } else if (firstname && userProfile.firstname) {
                firstname = `${firstname} (${userProfile.firstname})`
            }

            if (!lastname && userProfile.lastname) {
                lastname = userProfile.lastname
            } else if (lastname && userProfile.lastname) {
                lastname = `${lastname} (${userProfile.lastname})`
            }
        }

        if (!firstname) {
            firstname = req.user?.username || useremail.split('@')[0] || 'Пользователь'
        }

        // Отправка письма администратору
        const adminTemplatePath = path.join(
            __dirname,
            "../views/email/user-email-template.ejs"
        );
        const adminTemplateData = {
            name: req.user?.username || '',
            firstname: firstname,
            lastname: lastname,
            email: useremail,
            content: content
        };

        const adminMailOptions = {
            to: process.env.EMAIL_USER,
            subject: `Письмо от пользователя '${firstname} ${lastname}'`,
        };

        await sendTemplateEmail(
            adminTemplatePath,
            adminTemplateData,
            adminMailOptions
        );

        // Отправка автоматического ответа пользователю
        const autoReplyTemplatePath = path.join(
            __dirname,
            "../views/email/auto-reply-template.ejs"
        );
        const autoReplyTemplateData = {
            firstname: firstname,
            lastname: lastname,
            content: content
        };

        const autoReplyMailOptions = {
            to: useremail,
            subject: 'Мы получили ваше сообщение - The Everything Journal',
        };

        await sendTemplateEmail(
            autoReplyTemplatePath,
            autoReplyTemplateData,
            autoReplyMailOptions
        );
        await Message.create({
            firstname: firstname,
            lastname: lastname,
            email: useremail,
            content: content
        })
        res.status(200).json({
            success: true
        })

    } catch (error) {
        console.log("Произошла ошибка при отправке письма", error.message);
        res.status(500).json({
            success: false
        })
    }
}

exports.getReplyToUser = async (req, res, next) => {
    try {
        const page = req.query.page || 1
        const { messages, currentPage, hasNextPage, hasPreviousPage, nextPage, previousPage, lastPage, totalPages } = await getAdminMessagesPagination(page)
    
        res.render('admin/messages', {
            pageTitle: "Сообщения от пользователей",
            path: '/admin/messages',
            successMessage: req.flash("success")[0] || null,
            errorMessage: req.flash("error")[0] || null,
            csrfToken: req.csrfToken(),
            messages: messages,
            currentPage: currentPage,
            hasNextPage: hasNextPage,
            hasPreviousPage: hasPreviousPage,
            nextPage: nextPage,
            previousPage: previousPage,
            lastPage: lastPage,
            totalPages: totalPages,
            totalMessages: messages?.length || 0,
            newMessages: 0,
            repliedMessages: 0
        })
    } catch (error) {
        console.error("Ошибка в getReplyToUser: ", error.message)
        const err = new Error(error)
        err.httpStatusCode = 500
        next(err)
    }
}
// Функция для отправки ответа пользователю из админ-панели
exports.postReplyToUser = async (req, res, next) => {
    try {
        const { userEmail, subject, replyContent, originalMessage } = req.body;

        const replyTemplatePath = path.join(
            __dirname,
            "../views/email/admin-reply-template.ejs"
        );
        const replyTemplateData = {
            replyContent: replyContent,
            originalMessage: originalMessage,
            subject: subject
        };

        const replyMailOptions = {
            to: userEmail,
            subject: `Re: ${subject}`,
        };

        await sendTemplateEmail(
            replyTemplatePath,
            replyTemplateData,
            replyMailOptions
        );

        req.flash("success", "Ответ успешно отправлен пользователю!");
        res.redirect("/admin/messages");
    } catch (error) {
        console.log("Ошибка при отправке ответа", error.message);
        req.flash("error", "Не удалось отправить ответ!");
        res.redirect("/admin/messages");
    }
}