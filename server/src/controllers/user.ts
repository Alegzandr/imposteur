import IUser from '../interfaces/user';

const users: IUser[] = [];

export const addUser = (user: IUser) => {
    users.push(user);
};

export const deleteUser = (id: string) => {
    const index = users.findIndex((user) => user.id === id);
    if (index !== -1) {
        users.splice(index, 1);
    }
};
