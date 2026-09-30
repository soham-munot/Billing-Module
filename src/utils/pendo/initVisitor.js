

export const initPendoVisitor = ({ visitorId, email, full_name, accountId = 'account-001' }) => {
    pendo.initialize({
        visitor: {
            email,
            full_name,
            id: visitorId,
        },    
        account: {
            id: accountId
        }
    });
};
