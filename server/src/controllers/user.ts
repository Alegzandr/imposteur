import IUser from '../interfaces/user';

const users: IUser[] = [];

export const addUser = (newUser: IUser) => {
    users.push(newUser);
};

export const deleteUser = (userId: string) => {
    const index = users.findIndex((user) => user.id === userId);
    if (index !== -1) {
        users.splice(index, 1);
    }
};
